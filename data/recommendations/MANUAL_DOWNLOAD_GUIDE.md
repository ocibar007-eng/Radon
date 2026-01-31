# 📥 Download Manual - Recommendations DB Seed (10 fontes)

**Instruções:** Baixe os PDFs e salve em `data/recommendations/raw_docs/` com o nome exato indicado.

---

## ✅ Já Obtidos (Não precisa baixar)

1. **recist_1_1_original.pdf** ✅ (42KB, OK)
2. **irecist_immunotherapy.pdf** ✅ (174KB, OK)

---

## ❌ Precisam de Download Manual (8 arquivos)

### RSNA Paywalled (4 arquivos)

#### 1. fleischner_2017.pdf
- **DOI:** `10.1148/radiol.2017161659`
- **Título:** Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images
- **Tentativas automatizadas:** Sci-Hub failed (404/DNS)
- **Link Sci-Hub:** https://sci-hub.box/10.1148/radiol.2017161659
- **Alternativa:** Buscar no Google Scholar ou acesso institucional

#### 2. fleischner_2005.pdf
- **DOI:** `10.1148/radiol.2372041887`
- **Título:** Guidelines for Management of Small Pulmonary Nodules Detected on CT Scans
- **Link Sci-Hub:** https://sci-hub.box/10.1148/radiol.2372041887

#### 3. bosniak_v2019.pdf
- **DOI:** `10.1148/radiol.2019182646`
- **Título:** The Bosniak Classification of Cystic Renal Masses, Version 2019
- **Link Sci-Hub:** https://sci-hub.box/10.1148/radiol.2019182646

#### 4. svs_aaa_2018.pdf
- **DOI:** `10.1016/j.jvs.2017.10.044`
- **Título:** The Society for Vascular Surgery practice guidelines on AAA
- **Link Sci-Hub:** https://sci-hub.box/10.1016/j.jvs.2017.10.044

---

### ACR RADS (4 arquivos - URLs diretas ACR)

**Nota:** Estes estão baixando HTML (2KB) em vez do PDF real. Baixe manualmente do site ACR.

#### 5. li_rads_v2018.pdf
- **Sem DOI oficial** (guideline técnico ACR)
- **Link oficial:** https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS
- **Download direto (tentar):** https://www.acr.org/-/media/ACR/Files/RADS/LI-RADS/LI-RADS-2018-Core.pdf

#### 6. pi_rads_v2_1.pdf
- **Sem DOI oficial**
- **Link oficial:** https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/PI-RADS
- **Download direto (tentar):** https://www.acr.org/-/media/ACR/Files/RADS/PI-RADS/PIRADS-V2-1.pdf

#### 7. o_rads_us_v2020.pdf
- **Sem DOI oficial**
- **Link oficial:** https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/O-RADS
- **Download direto (tentar):** https://www.acr.org/-/media/ACR/Files/RADS/O-RADS/O-RADS-US-Risk-Stratification-and-Management-System.pdf

#### 8. o_rads_mri_v2022.pdf
- **Sem DOI oficial**
- **Link oficial:** https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/O-RADS
- **Download direto (tentar):** https://www.acr.org/-/media/ACR/Files/RADS/O-RADS/O-RADS-MRI-2022.pdf

---

## 🎯 Checklist Rápido

```bash
# Após baixar, verificar tamanhos (devem ser > 100KB, não 2KB):
ls -lh data/recommendations/raw_docs/

# Nomes exatos esperados:
fleischner_2017.pdf
fleischner_2005.pdf
bosniak_v2019.pdf
svs_aaa_2018.pdf
li_rads_v2018.pdf
pi_rads_v2_1.pdf
o_rads_us_v2020.pdf
o_rads_mri_v2022.pdf
```

---

## 🔄 Depois do Download

Quando você colocar os PDFs na pasta `data/recommendations/raw_docs/`, me avise que eu:
1. Verifico os tamanhos
2. Rodo o parse (PDF → JSON)
3. Insiro no banco SQLite
4. Gero relatório de completude

**Status Atual:** 2/10 fontes prontas (20%)  
**Meta Semana 1:** 10/10 fontes prontas (100%)
