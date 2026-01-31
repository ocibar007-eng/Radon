
import os
import random
import sqlite3
import time
import requests
import json
import logging
from typing import Optional, Tuple, Dict, Any
from pathlib import Path
from dataclasses import dataclass

# Configuração de Logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DeCSClient")

@dataclass
class DeCSResponse:
    pt_term: Optional[str]
    descriptors: list
    raw_response: Dict[str, Any]

class DeCSClient:
    """
    Cliente para a API DeCS (Descritores em Ciências da Saúde) v2
    com suporte a cache SQLite persistente e rate limiting.
    """
    
    BASE_URL = "https://api.bvsalud.org/decs/v2"
    API_KEY = "24509b8c8ff153b30f264ce35abad394"  # fallback
    
    def __init__(
        self,
        db_path: str = "decs_cache.db",
        requests_per_second: float = 20.0,
        timeout_seconds: float = 10.0,
        max_retries: int = 4,
        backoff_base: float = 0.6,
        backoff_max: float = 8.0
    ):
        self.db_path = db_path
        self.delay = 1.0 / requests_per_second
        self.last_request_time = 0.0
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.backoff_max = backoff_max
        self.api_key = os.getenv("DECS_API_KEY", self.API_KEY)
        self.session = requests.Session()
        self._init_db()

    def _init_db(self):
        """Inicializa o banco de dados SQLite para cache."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS decs_cache (
                    term_en TEXT PRIMARY KEY,
                    term_pt TEXT,
                    response_json TEXT,
                    timestamp REAL
                )
            ''')
            conn.commit()
            conn.close()
            logger.info(f"Cache DB inicializado em {self.db_path}")
        except Exception as e:
            logger.error(f"Erro ao inicializar DB: {e}")

    def _get_from_cache(self, term_en: str) -> Optional[DeCSResponse]:
        """Recupera tradução do cache."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT term_pt, response_json FROM decs_cache WHERE term_en = ?", (term_en,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                term_pt, response_json_str = row
                response_json = json.loads(response_json_str) if response_json_str else {}
                logger.debug(f"Cache HIT para '{term_en}'")
                return DeCSResponse(pt_term=term_pt, descriptors=[], raw_response=response_json)
            return None
        except Exception as e:
            logger.error(f"Erro ao ler do cache: {e}")
            return None

    def _save_to_cache(self, term_en: str, term_pt: Optional[str], response_json: Dict[str, Any]):
        """Salva resultado no cache."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            response_str = json.dumps(response_json, ensure_ascii=False)
            cursor.execute('''
                INSERT OR REPLACE INTO decs_cache (term_en, term_pt, response_json, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (term_en, term_pt, response_str, time.time()))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Erro ao salvar no cache: {e}")

    def _parse_response(self, data: Dict[str, Any], original_term: str) -> Optional[str]:
        """
        Extrai o melhor termo em PT-BR da resposta, verificando relevância.
        Itera sobre todos os resultados (candidates) e escolhe o que melhor
        corresponde ao termo original (em inglês).
        """
        try:
            objects = data.get('objects', [])
            if not objects:
                return None
            
            best_candidate = None
            best_score = -1.0
            
            original_lower = original_term.lower().strip()

            for obj in objects:
                # Extrair dados do candidato
                record = obj.get('decsws_response', {}).get('record_list', {}).get('record', {})
                if not record: continue

                # Identificar termos em EN e PT deste candidato
                term_en = ""
                term_pt = ""
                synonyms_en = []

                # 1. Analisar Descriptor List (Termos principais)
                desc_list = record.get('descriptor_list', [])
                if isinstance(desc_list, dict): desc_list = [desc_list] # Normalização
                
                for desc in desc_list:
                    attr = desc.get('attr', {})
                    lang = attr.get('lang', '').lower()
                    # Fallback xml
                    if not lang: lang = desc.get('@lang', '').lower()
                    
                    text = desc.get('descriptor', '') or desc.get('#text', '')
                    
                    if lang.startswith('en'):
                        term_en = text
                    elif lang.startswith('pt'):
                        term_pt = text

                # 2. Analisar Synonyms (Sinônimos)
                syn_list_cont = record.get('synonym_list', {})
                if isinstance(syn_list_cont, dict):
                    synonym_items = syn_list_cont.get('synonym', [])
                    if isinstance(synonym_items, dict): synonym_items = [synonym_items]
                    
                    for syn in synonym_items:
                        if isinstance(syn, dict):
                            s_lang = (syn.get('attr', {}).get('lang', '') or syn.get('@lang', '')).lower()
                            s_text = syn.get('#text', syn.get('val', ''))
                            if s_lang.startswith('en'):
                                synonyms_en.append(s_text)

                # SE não achamos PT ou EN, pular
                if not term_pt: continue
                
                # 3. Calcular Score de Relevância
                # Queremos evitar alucinações como "recurrent" -> "Brain Neoplasms"
                # Regra básica: O termo original TEM que estar contido no termo em inglês ou sinônimos
                
                candidate_text = term_en.lower() if term_en else ""
                
                # Pontuação
                score = 0.0
                
                # Match Exato (Ouro)
                if original_lower == candidate_text:
                    score = 10.0
                # Match Exato em Sinônimo (Prata)
                elif any(original_lower == s.lower() for s in synonyms_en):
                    score = 9.0
                # Contém a palavra (Bronze) - ex: "abducens" in "Abducens Nerve"
                elif original_lower in candidate_text.split(): # Token exato
                     score = 5.0
                elif any(original_lower in s.lower().split() for s in synonyms_en):
                     score = 4.0
                # Substring (Risco) - ex: "recurrent" in "Recurrent Laryngeal..."
                elif original_lower in candidate_text:
                    score = 2.0
                
                # Se não tem NENHUMA relação textual com o inglês, é provável alucinação/falso positivo
                # (A menos que seja mapeamento direto de código, mas aqui estamos buscando por texto)
                if score > best_score:
                    best_score = score
                    best_candidate = term_pt

            # Limiar de aceitação: Se score for 0 (nenhuma relação textual), rejeita
            if best_score > 0:
                return best_candidate
            
            return None

        except Exception as e:
            logger.error(f"Erro ao parsear resposta para {original_term}: {e}")
            return None

    def search_term(self, term: str) -> Optional[str]:
        """
        Busca um termo na API DeCS.
        1. Consulta Cache
        2. Se miss, consulta API (lang=pt)
        3. Se miss, consulta API (lang=en) (Fallback)
        4. Salva no Cache e retorna
        """
        cached = self._get_from_cache(term)
        if cached:
            return cached.pt_term

        # Rate Limiting
        current_time = time.time()
        time_diff = current_time - self.last_request_time
        if time_diff < self.delay:
            time.sleep(self.delay - time_diff)

        # Helper interno para fazer request
        def _request(lang_query):
            url = f"{self.BASE_URL}/search-by-words"
            params = {
                "words": term,
                "lang": lang_query,
                "format": "json"
            }
            headers = {"apikey": self.api_key}
            for attempt in range(1, self.max_retries + 1):
                try:
                    r = self.session.get(url, params=params, headers=headers, timeout=self.timeout_seconds)
                    self.last_request_time = time.time()
                    if r.status_code == 200:
                        try:
                            return r.json()
                        except Exception:
                            return None
                    if r.status_code in {429, 500, 502, 503, 504}:
                        retry_after = r.headers.get("Retry-After")
                        if retry_after:
                            try:
                                time.sleep(float(retry_after))
                            except ValueError:
                                time.sleep(self._backoff_sleep(attempt))
                        else:
                            time.sleep(self._backoff_sleep(attempt))
                        continue
                    return None
                except requests.Timeout:
                    if attempt < self.max_retries:
                        time.sleep(self._backoff_sleep(attempt))
                        continue
                    return None
                except requests.RequestException:
                    if attempt < self.max_retries:
                        time.sleep(self._backoff_sleep(attempt))
                        continue
                    return None
        
        # 1. Tentar lang=pt (default)
        data = _request("pt")
        pt_term = None
        if data:
            pt_term = self._parse_response(data, term)
        
        # 2. Se falhar, tentar lang=en (English fallback)
        if not pt_term:
            # logger.info(f"Termo '{term}' não encontrado em PT, tentando EN...")
            time.sleep(self.delay) # Respeitar rate limit entre requests
            data_en = _request("en")
            if data_en:
                pt_term = self._parse_response(data_en, term)
                if pt_term:
                    # Se achou via EN, salvamos o payload EN
                    data = data_en

        self._save_to_cache(term, pt_term, data if data else {"error": "not_found"})
        return pt_term

    def _backoff_sleep(self, attempt: int) -> float:
        base = min(self.backoff_max, self.backoff_base * (2 ** (attempt - 1)))
        jitter = random.uniform(0, self.backoff_base)
        return base + jitter

if __name__ == "__main__":
    # Teste rápido "Cardiology"
    client = DeCSClient()
    terms_to_test = ["Heart", "Cardiology", "Pneumonia", "NonExistentTerm123"]
    
    print("--- Teste DeCSClient ---")
    for t in terms_to_test:
        print(f"Buscando: {t}...")
        res = client.search_term(t)
        print(f"Resultado: {res}\n")
