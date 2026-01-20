#!/usr/bin/env python3
"""
🗂️ REORGANIZADOR DE REPOSITÓRIO PROMPTS
========================================
Script automatizado para reorganizar, renomear e estruturar arquivos
do repositório de prompts médicos/radiológicos.

Uso:
    python reorganizar_repo.py --dry-run   # Simula sem executar
    python reorganizar_repo.py --execute   # Executa as mudanças
    python reorganizar_repo.py --report    # Apenas gera relatório
"""

import os
import re
import shutil
import json
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

REPO_ROOT = Path("/Users/lucasdonizetecamargos/PROMPTS")
ARCHIVE_DIR = REPO_ROOT / "ARCHIVE"
REPORT_FILE = REPO_ROOT / ".agent" / "reorganization_report.md"

# Estrutura de pastas proposta
FOLDER_STRUCTURE = {
    "INSTRUCOES": "Arquivos de instrução e configuração de prompts",
    "USG": {
        "ABDOME": "Ultrassom de abdome total",
        "PELVE": "Ultrassom pélvico (masculino/feminino)",
        "DOPPLER": "Estudos Doppler",
        "OBSTETRICO": "Ultrassom obstétrico",
        "PARTES_MOLES": "Partes moles, tireoide, etc",
    },
    "TC": "Tomografia computadorizada",
    "RM": "Ressonância magnética", 
    "REFERENCIAS": {
        "BIOMETRIA": "Manual de biometria e valores normais",
        "PEDIATRIA": "Referências pediátricas",
        "CALCULOS": "Fórmulas e cálculos médicos",
    },
    "ARCHIVE": "Versões antigas e backups",
}

# Palavras-chave para detectar modalidade/tipo
KEYWORDS = {
    "USG": ["ultrassonografia", "ultrassom", "usg", "ecografia", "eco", "sonografia"],
    "TC": ["tomografia", "tc", "ct", "computed tomography"],
    "RM": ["ressonância", "rm", "mri", "magnetic resonance"],
    "DOPPLER": ["doppler", "fluxo", "velocidade", "índice resistivo", "ir", "ip"],
    "PEDIATRIA": ["pediátrico", "criança", "neonato", "recém-nascido", "idade gestacional", "pediatric", "child"],
    "ABDOME": ["abdome", "abdominal", "fígado", "baço", "rins", "vesícula", "pâncreas", "liver", "spleen", "kidney"],
    "PELVE": ["pelve", "próstata", "útero", "ovário", "bexiga", "prostate", "uterus", "ovary", "bladder"],
    "BIOMETRIA": ["biometria", "medidas", "valores normais", "dimensões", "volume", "measurements"],
}


class ActionType(Enum):
    KEEP = "manter"
    RENAME = "renomear"
    MOVE = "mover"
    RENAME_AND_MOVE = "renomear_e_mover"
    ARCHIVE = "arquivar"
    DELETE = "deletar"


@dataclass
class FileAnalysis:
    """Análise de um arquivo do repositório"""
    original_path: Path
    original_name: str
    extension: str
    size_bytes: int
    
    # Análise de conteúdo
    detected_modality: Optional[str] = None
    detected_region: Optional[str] = None
    detected_type: Optional[str] = None
    first_heading: Optional[str] = None
    content_preview: str = ""
    
    # Ação proposta
    action: ActionType = ActionType.KEEP
    proposed_name: Optional[str] = None
    proposed_folder: Optional[Path] = None
    justification: str = ""
    
    # Status
    executed: bool = False
    error: Optional[str] = None


class RepoReorganizer:
    """Reorganizador principal do repositório"""
    
    def __init__(self, repo_root: Path, dry_run: bool = True):
        self.repo_root = repo_root
        self.dry_run = dry_run
        self.analyses: list[FileAnalysis] = []
        self.log: list[str] = []
        
    def _log(self, message: str):
        """Adiciona mensagem ao log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log.append(f"[{timestamp}] {message}")
        print(f"[{timestamp}] {message}")
    
    def scan_files(self) -> list[Path]:
        """Escaneia todos os arquivos relevantes do repositório"""
        files = []
        for ext in ["*.md", "*.txt"]:
            files.extend(self.repo_root.rglob(ext))
        
        # Filtrar arquivos de sistema e já arquivados
        files = [f for f in files if not any(part.startswith(".") for part in f.parts)]
        files = [f for f in files if "ARCHIVE" not in str(f)]
        
        self._log(f"Encontrados {len(files)} arquivos para análise")
        return sorted(files)
    
    def analyze_content(self, file_path: Path) -> dict:
        """Analisa o conteúdo de um arquivo para detectar tema"""
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            return {"error": str(e)}
        
        content_lower = content.lower()
        preview = content[:500]
        
        # Detectar primeiro heading
        heading_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        first_heading = heading_match.group(1).strip() if heading_match else None
        
        # Detectar palavras-chave
        detected = {}
        for category, keywords in KEYWORDS.items():
            score = sum(1 for kw in keywords if kw.lower() in content_lower)
            if score > 0:
                detected[category] = score
        
        return {
            "preview": preview,
            "first_heading": first_heading,
            "detected_keywords": detected,
            "line_count": content.count("\n"),
            "char_count": len(content),
        }
    
    def suggest_name(self, analysis: FileAnalysis, content_info: dict) -> str:
        """Sugere um novo nome para o arquivo baseado no conteúdo"""
        original = analysis.original_name
        
        # Se já tem nome bom, manter
        if re.match(r'^[A-Z][A-Z0-9_]+\.(md|txt)$', original):
            if " " not in original and "(" not in original:
                return original.replace(".txt", ".md")
        
        # Extrair informações do conteúdo
        detected = content_info.get("detected_keywords", {})
        heading = content_info.get("first_heading", "")
        
        # Determinar componentes do nome
        parts = []
        
        # Modalidade
        if "USG" in detected:
            parts.append("USG")
        elif "TC" in detected:
            parts.append("TC")
        elif "RM" in detected:
            parts.append("RM")
        elif "DOPPLER" in detected:
            parts.append("DOPPLER")
        
        # Região
        if "ABDOME" in detected:
            parts.append("ABDOME")
        elif "PELVE" in detected:
            parts.append("PELVE")
        
        # Tipo especial
        if "PEDIATRIA" in detected:
            parts.append("PEDIATRIA")
        if "BIOMETRIA" in detected:
            parts.append("BIOMETRIA")
        
        # Se não detectou nada, usar heading ou nome original
        if not parts:
            if heading:
                # Limpar heading para usar como nome
                clean = re.sub(r'[^\w\s]', '', heading)
                clean = "_".join(clean.upper().split()[:4])
                parts.append(clean)
            else:
                # Limpar nome original
                clean = re.sub(r'\s*\(\d+\)\s*', '', original)  # Remove (7), (8), etc
                clean = re.sub(r'[^\w]', '_', clean)
                clean = re.sub(r'_+', '_', clean).strip('_').upper()
                parts.append(clean)
        
        # Adicionar tipo baseado no conteúdo
        if "valores normais" in content_info.get("preview", "").lower():
            parts.append("VALORES_NORMAIS")
        elif "referência" in content_info.get("preview", "").lower():
            parts.append("REFERENCIAS")
        
        # Montar nome final
        new_name = "_".join(parts)
        new_name = re.sub(r'_+', '_', new_name)  # Remove underscores duplicados
        
        return f"{new_name}.md"
    
    def suggest_folder(self, analysis: FileAnalysis, content_info: dict) -> Path:
        """Sugere pasta de destino baseado no conteúdo"""
        detected = content_info.get("detected_keywords", {})
        
        # Lógica de decisão
        if "PEDIATRIA" in detected:
            return self.repo_root / "REFERENCIAS" / "PEDIATRIA"
        
        if "BIOMETRIA" in detected:
            return self.repo_root / "REFERENCIAS" / "BIOMETRIA"
        
        if "DOPPLER" in detected:
            return self.repo_root / "USG" / "DOPPLER"
        
        if "USG" in detected:
            if "ABDOME" in detected:
                return self.repo_root / "USG" / "ABDOME"
            elif "PELVE" in detected:
                return self.repo_root / "USG" / "PELVE"
            return self.repo_root / "USG"
        
        if "TC" in detected:
            return self.repo_root / "TC"
        
        if "RM" in detected:
            return self.repo_root / "RM"
        
        # Default: manter no local atual
        return analysis.original_path.parent
    
    def analyze_file(self, file_path: Path) -> FileAnalysis:
        """Analisa um arquivo e propõe ações"""
        analysis = FileAnalysis(
            original_path=file_path,
            original_name=file_path.name,
            extension=file_path.suffix,
            size_bytes=file_path.stat().st_size,
        )
        
        content_info = self.analyze_content(file_path)
        
        if "error" in content_info:
            analysis.error = content_info["error"]
            return analysis
        
        analysis.content_preview = content_info.get("preview", "")[:200]
        analysis.first_heading = content_info.get("first_heading")
        
        # Detectar modalidade e região principais
        detected = content_info.get("detected_keywords", {})
        if detected:
            sorted_detected = sorted(detected.items(), key=lambda x: x[1], reverse=True)
            if sorted_detected:
                analysis.detected_modality = sorted_detected[0][0]
                if len(sorted_detected) > 1:
                    analysis.detected_region = sorted_detected[1][0]
        
        # Verificar se precisa de ação
        needs_rename = False
        needs_move = False
        
        # Arquivo com nome genérico?
        if "ai_studio_code" in analysis.original_name.lower():
            needs_rename = True
            analysis.justification = "Nome genérico (ai_studio_code)"
        elif " " in analysis.original_name:
            needs_rename = True
            analysis.justification = "Nome contém espaços"
        elif analysis.extension == ".txt":
            needs_rename = True
            analysis.justification = "Extensão .txt → .md"
        elif "PRE_REFACTOR" in analysis.original_name or "_old" in analysis.original_name.lower():
            analysis.action = ActionType.ARCHIVE
            analysis.proposed_folder = ARCHIVE_DIR
            analysis.justification = "Versão antiga/backup"
            return analysis
        
        # Verificar se precisa mover
        proposed_folder = self.suggest_folder(analysis, content_info)
        if proposed_folder != analysis.original_path.parent:
            needs_move = True
            if not analysis.justification:
                analysis.justification = f"Mover para {proposed_folder.relative_to(self.repo_root)}"
        
        # Definir ação
        if needs_rename and needs_move:
            analysis.action = ActionType.RENAME_AND_MOVE
        elif needs_rename:
            analysis.action = ActionType.RENAME
        elif needs_move:
            analysis.action = ActionType.MOVE
        else:
            analysis.action = ActionType.KEEP
        
        # Propor novo nome e pasta
        if needs_rename:
            analysis.proposed_name = self.suggest_name(analysis, content_info)
        else:
            analysis.proposed_name = analysis.original_name
        
        analysis.proposed_folder = proposed_folder
        
        return analysis
    
    def analyze_all(self):
        """Analisa todos os arquivos do repositório"""
        self._log("Iniciando análise completa do repositório...")
        
        files = self.scan_files()
        for file_path in files:
            analysis = self.analyze_file(file_path)
            self.analyses.append(analysis)
            
            if analysis.action != ActionType.KEEP:
                self._log(f"  → {analysis.original_name}: {analysis.action.value}")
        
        self._log(f"Análise concluída: {len(self.analyses)} arquivos analisados")
    
    def create_folder_structure(self):
        """Cria a estrutura de pastas proposta"""
        self._log("Criando estrutura de pastas...")
        
        def create_folders(structure: dict, parent: Path):
            for name, value in structure.items():
                folder = parent / name
                if not folder.exists():
                    if not self.dry_run:
                        folder.mkdir(parents=True, exist_ok=True)
                    self._log(f"  {'[DRY-RUN] ' if self.dry_run else ''}Criando: {folder.relative_to(self.repo_root)}")
                
                if isinstance(value, dict):
                    create_folders(value, folder)
        
        create_folders(FOLDER_STRUCTURE, self.repo_root)
    
    def execute_action(self, analysis: FileAnalysis) -> bool:
        """Executa a ação proposta para um arquivo"""
        if analysis.action == ActionType.KEEP:
            return True
        
        src = analysis.original_path
        dest_folder = analysis.proposed_folder or src.parent
        dest_name = analysis.proposed_name or analysis.original_name
        dest = dest_folder / dest_name
        
        try:
            if self.dry_run:
                self._log(f"  [DRY-RUN] {src.name} → {dest.relative_to(self.repo_root)}")
            else:
                # Criar pasta de destino se não existir
                dest_folder.mkdir(parents=True, exist_ok=True)
                
                # Mover/renomear arquivo
                shutil.move(str(src), str(dest))
                self._log(f"  ✓ {src.name} → {dest.relative_to(self.repo_root)}")
            
            analysis.executed = True
            return True
            
        except Exception as e:
            analysis.error = str(e)
            self._log(f"  ✗ ERRO: {src.name} - {e}")
            return False
    
    def execute_all(self):
        """Executa todas as ações propostas"""
        self._log(f"Executando reorganização {'(DRY-RUN)' if self.dry_run else ''}...")
        
        # Primeiro, criar estrutura de pastas
        self.create_folder_structure()
        
        # Depois, executar ações em cada arquivo
        actions_count = {action: 0 for action in ActionType}
        
        for analysis in self.analyses:
            if self.execute_action(analysis):
                actions_count[analysis.action] += 1
        
        self._log(f"Reorganização concluída:")
        for action, count in actions_count.items():
            if count > 0:
                self._log(f"  - {action.value}: {count} arquivos")
    
    def generate_report(self) -> str:
        """Gera relatório da reorganização em Markdown"""
        report = []
        report.append("# 📊 Relatório de Reorganização do Repositório\n")
        report.append(f"**Data:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        report.append(f"**Modo:** {'Simulação (DRY-RUN)' if self.dry_run else 'Execução Real'}\n")
        report.append("")
        
        # Resumo
        report.append("## Resumo\n")
        actions_count = {}
        for a in self.analyses:
            actions_count[a.action] = actions_count.get(a.action, 0) + 1
        
        report.append("| Ação | Quantidade |")
        report.append("|------|------------|")
        for action, count in actions_count.items():
            report.append(f"| {action.value} | {count} |")
        report.append("")
        
        # Detalhes das mudanças
        changes = [a for a in self.analyses if a.action != ActionType.KEEP]
        if changes:
            report.append("## Mudanças Propostas\n")
            report.append("| Arquivo Original | Ação | Novo Nome/Local | Justificativa |")
            report.append("|-----------------|------|-----------------|---------------|")
            
            for a in changes:
                new_loc = ""
                if a.proposed_folder:
                    try:
                        new_loc = str(a.proposed_folder.relative_to(self.repo_root))
                    except ValueError:
                        new_loc = str(a.proposed_folder)
                if a.proposed_name:
                    new_loc = f"{new_loc}/{a.proposed_name}" if new_loc else a.proposed_name
                
                status = "✓" if a.executed else ("⚠️" if a.error else "")
                report.append(f"| {a.original_name} | {a.action.value} {status} | {new_loc} | {a.justification} |")
            report.append("")
        
        # Arquivos mantidos
        kept = [a for a in self.analyses if a.action == ActionType.KEEP]
        if kept:
            report.append("## Arquivos Mantidos (sem alterações)\n")
            for a in kept:
                report.append(f"- `{a.original_path.relative_to(self.repo_root)}`")
            report.append("")
        
        # Erros
        errors = [a for a in self.analyses if a.error]
        if errors:
            report.append("## ⚠️ Erros\n")
            for a in errors:
                report.append(f"- **{a.original_name}**: {a.error}")
            report.append("")
        
        # Log de execução
        report.append("## Log de Execução\n")
        report.append("```")
        report.extend(self.log)
        report.append("```")
        
        return "\n".join(report)
    
    def save_report(self):
        """Salva o relatório em arquivo"""
        report = self.generate_report()
        REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
        REPORT_FILE.write_text(report, encoding="utf-8")
        self._log(f"Relatório salvo em: {REPORT_FILE}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Reorganizador do Repositório PROMPTS")
    parser.add_argument("--dry-run", action="store_true", default=True,
                       help="Simula as mudanças sem executar (padrão)")
    parser.add_argument("--execute", action="store_true",
                       help="Executa as mudanças de verdade")
    parser.add_argument("--report", action="store_true",
                       help="Apenas gera relatório sem executar")
    
    args = parser.parse_args()
    
    # Determinar modo
    dry_run = not args.execute
    
    print("=" * 60)
    print("🗂️  REORGANIZADOR DO REPOSITÓRIO PROMPTS")
    print("=" * 60)
    print(f"Modo: {'SIMULAÇÃO (dry-run)' if dry_run else '⚠️ EXECUÇÃO REAL'}")
    print(f"Repositório: {REPO_ROOT}")
    print("=" * 60)
    print()
    
    # Executar
    reorganizer = RepoReorganizer(REPO_ROOT, dry_run=dry_run)
    reorganizer.analyze_all()
    
    if not args.report:
        reorganizer.execute_all()
    
    reorganizer.save_report()
    
    print()
    print("=" * 60)
    print("Concluído! Verifique o relatório em:")
    print(f"  {REPORT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
