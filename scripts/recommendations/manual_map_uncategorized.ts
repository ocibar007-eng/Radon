// scripts/recommendations/manual_map_uncategorized.ts
// Manual mapping of top uncategorized sources (ESGAR, specialized guidelines, etc.)

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');

interface ManualMapping {
    source_ids: string[];
    domain: string;
    topic: string;
    notes?: string;
}

// Manual mappings derived from document title/content analysis
const MANUAL_MAPPINGS: ManualMapping[] = [
    // ESGAR Rectal MRI
    {
        source_ids: ['esgar_consensus_rectal_mri_2016', 'esgar_consensus_2025_w', 'esgar_consensus_2025_z',
            'esgar_guideline_2020', 'esgar_consensus_2024_a', 'esgar_consensus_2024_b',
            'esgar_imaging_protocol_2024', 'esgar_guideline_2019', 'esgar_updated_guideline_2025',
            'esgar_updated_guideline_2025_dup'],
        domain: 'Abdominal',
        topic: 'ESGAR Protocols',
        notes: 'European Society of Gastrointestinal and Abdominal Radiology guidelines'
    },

    // Scrotal US / GU
    {
        source_ids: ['scrotal_2025', 'ACR_AIUM_SPR_SRU_PRACTICE_PARAMETER_FOR_THE_PERFORMANCE_OF_SCROTAL_ULTRASOUND_EXAMINATIONS'],
        domain: 'Genitourinary',
        topic: 'Scrotal Ultrasound',
        notes: 'ACR/AIUM practice parameters for scrotal imaging'
    },

    // GIST
    {
        source_ids: ['2023-GEIS-guidelines-for-GIST'],
        domain: 'Oncology',
        topic: 'GIST',
        notes: 'Gastrointestinal stromal tumor guidelines'
    },

    // Gynecologic Cancer
    {
        source_ids: ['Intl_J_Gynecology___Obste_-_2025_-_Renz_-_Cancer_of_the_ovary__fallopian_tube__and_peritoneum__2025_update'],
        domain: 'Gynecology',
        topic: 'Ovarian Cancer',
        notes: 'FIGO ovarian cancer guidelines 2025'
    },

    // Amenorrhea / Reproductive
    {
        source_ids: ['current_evaluation_of_amenorrhea'],
        domain: 'Gynecology',
        topic: 'Reproductive Medicine',
        notes: 'Amenorrhea workup guidelines'
    },

    // GI - IBD
    {
        source_ids: ['jjaf106', 'jjaf107'],
        domain: 'Abdominal',
        topic: 'Inflammatory Bowel Disease',
        notes: 'ECCO-ESGAR inflammatory bowel disease imaging'
    },

    // Oncology - Radiotherapy
    {
        source_ids: ['oncology_ejc_2022_radiotherapy'],
        domain: 'Oncology',
        topic: 'Radiation Oncology',
        notes: 'European Journal of Cancer radiotherapy guidelines'
    },

    // GI - Pancreatic Cysts
    {
        source_ids: ['tanaka2017'],
        domain: 'Abdominal',
        topic: 'Pancreatic Cysts',
        notes: 'Fukuoka guidelines for pancreatic cystic lesions'
    },

    // Hepatology - NAFLD
    {
        source_ids: ['esteatose_', 'younossi2016'],
        domain: 'Abdominal',
        topic: 'Hepatic Steatosis',
        notes: 'NAFLD / hepatic steatosis review'
    },

    // Vascular - PE / DVT
    {
        source_ids: ['konstantinides2019', 'jvb-23-e20230107'],
        domain: 'Vascular',
        topic: 'Pulmonary Embolism',
        notes: 'ESC pulmonary embolism and DVT guidelines'
    },

    // Oncology - Response Criteria
    {
        source_ids: ['Wahl_PERCIST_JNM_2009', 'megibow2017'],
        domain: 'Oncology',
        topic: 'Response Criteria',
        notes: 'PERCIST and tumor response assessment'
    },

    // Oncology - PSMA PET
    {
        source_ids: ['PSMA_PET_Guideline_2_0_1_17_23_PDF_for_website'],
        domain: 'Oncology',
        topic: 'PSMA PET',
        notes: 'Prostate-specific membrane antigen PET imaging'
    },

    // Oncology - Myeloma
    {
        source_ids: ['messiou-et-al-2019-guidelines-for-acquisition-interpretation-and-reporting-of-whole-body-mri-in-myeloma-myeloma'],
        domain: 'Oncology',
        topic: 'Myeloma Imaging',
        notes: 'Whole-body MRI protocol for multiple myeloma'
    },

    // Thoracic - Fleischner variants
    {
        source_ids: ['macmahon2017', 'macmahon2005'],
        domain: 'Thoracic',
        topic: 'Pulmonary Nodules',
        notes: 'Fleischner Society guidelines (alternative IDs)'
    },

    // General ESGAR numbered consensus
    {
        source_ids: ['s00330-020-06826-5', 's00330-025-12274-w', 's00330-016-4471-7',
            's00330-025-12275-9', 's00330-024-11241-1', 's00330-025-11583-4',
            's00330-015-3900-3', 's00330-024-11124-5', 's00330-025-11583-4__1_',
            's00330-024-10940-z', 's00330-019-6002-9'],
        domain: 'Abdominal',
        topic: 'ESGAR Protocols',
        notes: 'European Radiology ESGAR consensus documents'
    },

    // Radiology journal articles
    {
        source_ids: ['radiol_2016142043', '479_full', '8606_00', 'dddt-11-1719'],
        domain: 'General',
        topic: 'Radiology Journal',
        notes: 'Radiology journal articles'
    },

    // Miscellaneous DOI articles
    {
        source_ids: ['1-s2_0-S2211568414001569-main', 'PIIS0959804922007511', 'PIIS0923753419656218',
            'PIIS1546144020313995', '10_1148_radiol_2019182646', 'peacock2020',
            's10434-018-6462-1', 'magers2018', 'clinical_imaging_2020', 'bmjopen-2021-052294',
            '6605567', 'thomassinnaggara_2020_oi_190746', 'ex-2025_2025-2-6', 'EGT-2710_v1_Download'],
        domain: 'General',
        topic: 'Miscellaneous',
        notes: 'Various journal articles and case studies'
    }
];

async function main() {
    console.log('\n🗺️  Manual mapping of uncategorized sources...\n');

    const db = new Database(DB_PATH);
    let totalMapped = 0;

    const updateStmt = db.prepare(`
    UPDATE recommendations 
    SET dominio = ?, topico = ?
    WHERE source_id = ?
  `);

    MANUAL_MAPPINGS.forEach(mapping => {
        console.log(`\n📍 ${mapping.domain} / ${mapping.topic}:`);
        if (mapping.notes) {
            console.log(`   ℹ️  ${mapping.notes}`);
        }

        let mappingTotal = 0;
        mapping.source_ids.forEach(sourceId => {
            const result = updateStmt.run(mapping.domain, mapping.topic, sourceId);
            if (result.changes > 0) {
                totalMapped += result.changes;
                mappingTotal += result.changes;
                console.log(`   ✅ ${sourceId} (${result.changes} recs)`);
            }
        });

        console.log(`   → Subtotal: ${mappingTotal} recommendations`);
    });

    db.close();

    console.log(`\n✨ Manual mapping complete!`);
    console.log(`   Total recommendations mapped: ${totalMapped}\n`);
}

main().then(() => {
    // Final coverage check
    const db = new Database(DB_PATH);
    const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN dominio IS NOT NULL AND dominio != '' THEN 1 ELSE 0 END) as mapped
    FROM recommendations
  `).get() as { total: number; mapped: number };

    const percentage = ((stats.mapped / stats.total) * 100).toFixed(1);
    console.log(`📊 Final Coverage:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Mapped: ${stats.mapped} (${percentage}%)`);
    console.log(`   Unmapped: ${stats.total - stats.mapped}\n`);

    db.close();
});
