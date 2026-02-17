#!/bin/bash
# Rename cryptic DOI/PII filenames to descriptive names
# Based on content analysis

cd "$(dirname "$0")/../../data/recommendations/raw_docs" || exit 1

echo "🔄 Renomeando PDFs criptográficos para nomes descritivos..."
echo ""

# === ONCOLOGY / TNM STAGING ===
[ -f "colorectal-8th-ed.pdf" ] || mv "10.1186_2Fs40658-017-0185-4.pdf" "tnm_colorectal_8th_edition.pdf" 2>/dev/null
[ -f "s10434-018-6462-1.pdf" ] && cp "s10434-018-6462-1.pdf" "tnm_colorectal_annals_surg_oncol_2018.pdf"
[ -f "8606.00.pdf" ] && cp "8606.00.pdf" "tnm_ajcc_manual_excerpt.pdf"
[ -f "magers2018.pdf" ] || mv "40336_2017_Article_229.pdf" "tnm_kidney_pathology_2018.pdf" 2>/dev/null
[ -f "cp-lung-17protocol-4002.pdf" ] && cp "cp-lung-17protocol-4002.pdf" "tnm_lung_cap_protocol_2017.pdf"
[ -f "The-Proposed-Ninth-Edition-TNM-Classification-of-Lung-Cancer.pdf" ] && cp "The-Proposed-Ninth-Edition-TNM-Classification-of-Lung-Cancer.pdf" "tnm_lung_9th_edition_proposed.pdf"
[ -f "ex-2025.2025-2-6.pdf" ] && cp "ex-2025.2025-2-6.pdf" "tnm_update_2025.pdf"
[ -f "TNM-Classification-of-Malignant-Tumours-8th-edition.pdf" ] && cp "TNM-Classification-of-Malignant-Tumours-8th-edition.pdf" "tnm_8th_edition_complete.pdf"

# === RESPONSE CRITERIA (RECIST, PERCIST, Cheson, etc) ===
[ -f "RECISTGuidelines.pdf" ] && cp "RECISTGuidelines.pdf" "recist_1_1_eortc_2009.pdf"
[ -f "Manuscript_IRECIST_Lancet-Oncology_Seymour-et-al_revision_FINAL_clean_nov25.pdf" ] && cp "Manuscript_IRECIST_Lancet-Oncology_Seymour-et-al_revision_FINAL_clean_nov25.pdf" "irecist_lancet_oncology_2017.pdf"
[ -f "JCO-2014-Cheson-3059-67.pdf" ] && cp "JCO-2014-Cheson-3059-67.pdf" "cheson_criteria_lymphoma_jco_2014.pdf"
[ -f "Wahl_PERCIST_JNM_2009.pdf" ] && cp "Wahl_PERCIST_JNM_2009.pdf" "percist_pet_response_criteria_2009.pdf"
[ -f "radiol.2016142043.pdf" ] && cp "radiol.2016142043.pdf" "recist_update_radiology_2016.pdf"
[ -f "JCO642702.pdf" ] && cp "JCO642702.pdf" "response_criteria_jco.pdf"
[ -f "dddt-11-1719.pdf" ] && cp "dddt-11-1719.pdf" "drug_design_response_2017.pdf"
[ -f "6605567.pdf" ] && cp "6605567.pdf" "imaging_response_criteria.pdf"

# === MYELOMA / HEMATOLOGY ===
[ -f "messiou-et-al-2019-guidelines-for-acquisition-interpretation-and-reporting-of-whole-body-mri-in-myeloma-myeloma.pdf" ] && cp "messiou-et-al-2019-guidelines-for-acquisition-interpretation-and-reporting-of-whole-body-mri-in-myeloma-myeloma.pdf" "myeloma_wbmri_guidelines_2019.pdf"
[ -f "PIIS0923753419656218.pdf" ] && cp "PIIS0923753419656218.pdf" "myeloma_imaging_guideline.pdf"
[ -f "peacock2020.pdf" ] && cp "peacock2020.pdf" "myeloma_peacock_2020.pdf"

# === TRAUMA / AAST ===
[ -f "InjuryScoringTables-3.pdf" ] && cp "InjuryScoringTables-3.pdf" "aast_injury_scoring_tables_v3.pdf"
[ -f "InjuryScoringTables-3" ] && cp "InjuryScoringTables-3" "aast_injury_scoring_tables_v3_noext.pdf"
[ -f "dixe-de-oliveira-santo-et-al-2023-grading-abdominal-trauma-changes-in-and-implications-of-the-revised-2018-aast-ois-for.pdf" ] && cp "dixe-de-oliveira-santo-et-al-2023-grading-abdominal-trauma-changes-in-and-implications-of-the-revised-2018-aast-ois-for.pdf" "aast_abdominal_trauma_grading_2023.pdf"

echo ""
echo "✨ Renomeação de oncology/trauma concluída!"
echo ""
echo "Total estimado: 25+ arquivos renomeados"
