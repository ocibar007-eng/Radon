export function insertRecommendations(recommendations: Recommendation[]): number {
    const db = new Database(DB_PATH);

    // Existing schema: dominio, topico, achado, condicao_if, acao_then, etc
    const stmt = db.prepare(`
    INSERT INTO recommendations (
      doc_id, source_id, rec_type, dominio, topico, achado,
      condicao_if, acao_then, followup_interval, verbatim_quote,
      snippet_suporte, anchor, pagina, confidence, extracted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    let inserted = 0;
    for (const rec of recommendations) {
        try {
            // Map extracted fields to existing schema
            const achado = rec.clinical_context.split(',')[0].trim() || 'general';
            const condicao_if = rec.clinical_context;
            const acao_then = rec.recommendation_text;
            const pagina = rec.page_numbers ? parseInt(rec.page_numbers) : 0;
            const confidence = rec.certainty_score / 100;

            stmt.run(
                rec.doc_id,
                rec.source_id,
                rec.rec_type,
                '', // dominio - will populate later
                '', // topico - will populate later
                achado,
                condicao_if,
                acao_then,
                null, // followup_interval
                rec.recommendation_text,
                rec.recommendation_text,
                rec.clinical_context,
                pagina,
                confidence,
                rec.extracted_at
            );
            inserted++;
        } catch (err) {
            console.error(`Failed to insert rec: ${err}`);
        }
    }

    db.close();
    return inserted;
}
