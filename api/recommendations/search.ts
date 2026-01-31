// api/recommendations/search.ts
// REST API for querying recommendations database

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/recommendations/db/recommendations.db');

export interface SearchFilters {
    domain?: string;
    topic?: string;
    finding?: string;        // achado/condicao_if
    rec_type?: string;
    source_id?: string;
    min_confidence?: number;
    limit?: number;
    offset?: number;
    query?: string;          // full-text search
}

export interface Recommendation {
    rec_id: string;
    doc_id: string;
    source_id: string;
    rec_type: string;
    dominio: string;
    topico: string;
    achado: string;
    condicao_if: string;
    acao_then: string;
    followup_interval: string;
    verbatim_quote: string;
    snippet_suporte: string;
    anchor: string;
    pagina: number;
    confidence: number;
    extracted_at: string;
    pipeline_version: string;
}

export interface SearchResult {
    recommendations: Recommendation[];
    total: number;
    page: number;
    pageSize: number;
    filters: SearchFilters;
}

export function searchRecommendations(filters: SearchFilters = {}): SearchResult {
    const db = new Database(DB_PATH, { readonly: true });

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.domain) {
        conditions.push('dominio = ?');
        params.push(filters.domain);
    }

    if (filters.topic) {
        conditions.push('topico = ?');
        params.push(filters.topic);
    }

    if (filters.rec_type) {
        conditions.push('rec_type = ?');
        params.push(filters.rec_type);
    }

    if (filters.source_id) {
        conditions.push('source_id = ?');
        params.push(filters.source_id);
    }

    if (filters.min_confidence !== undefined) {
        conditions.push('confidence >= ?');
        params.push(filters.min_confidence);
    }

    if (filters.finding) {
        conditions.push('(achado LIKE ? OR condicao_if LIKE ?)');
        params.push(`%${filters.finding}%`, `%${filters.finding}%`);
    }

    if (filters.query) {
        conditions.push(`(
      acao_then LIKE ? OR 
      condicao_if LIKE ? OR 
      verbatim_quote LIKE ? OR
      snippet_suporte LIKE ?
    )`);
        params.push(`%${filters.query}%`, `%${filters.query}%`, `%${filters.query}%`, `%${filters.query}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM recommendations ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };

    // Get paginated results
    const dataQuery = `
    SELECT * FROM recommendations 
    ${whereClause}
    ORDER BY confidence DESC, source_id ASC
    LIMIT ? OFFSET ?
  `;

    const recommendations = db.prepare(dataQuery).all(...params, limit, offset) as Recommendation[];

    db.close();

    return {
        recommendations,
        total: countResult.total,
        page,
        pageSize: limit,
        filters
    };
}

export function getRecommendationById(recId: string): Recommendation | null {
    const db = new Database(DB_PATH, { readonly: true });
    const rec = db.prepare('SELECT * FROM recommendations WHERE rec_id = ?').get(recId) as Recommendation | undefined;
    db.close();
    return rec || null;
}

export function getAvailableDomains(): string[] {
    const db = new Database(DB_PATH, { readonly: true });
    const domains = db.prepare(`
    SELECT DISTINCT dominio 
    FROM recommendations 
    WHERE dominio IS NOT NULL AND dominio != ''
    ORDER BY dominio
  `).all() as { dominio: string }[];
    db.close();
    return domains.map(d => d.dominio);
}

export function getTopicsByDomain(domain: string): string[] {
    const db = new Database(DB_PATH, { readonly: true });
    const topics = db.prepare(`
    SELECT DISTINCT topico 
    FROM recommendations 
    WHERE dominio = ? AND topico IS NOT NULL AND topico != ''
    ORDER BY topico
  `).get(domain) as { topico: string }[];
    db.close();
    return topics.map(t => t.topico);
}

export function getStats() {
    const db = new Database(DB_PATH, { readonly: true });

    const total = db.prepare('SELECT COUNT(*) as count FROM recommendations').get() as { count: number };

    const byDomain = db.prepare(`
    SELECT dominio, COUNT(*) as count 
    FROM recommendations 
    WHERE dominio IS NOT NULL AND dominio != ''
    GROUP BY dominio 
    ORDER BY count DESC
  `).all() as { dominio: string; count: number }[];

    const byType = db.prepare(`
    SELECT rec_type, COUNT(*) as count 
    FROM recommendations 
    GROUP BY rec_type 
    ORDER BY count DESC
  `).all() as { rec_type: string; count: number }[];

    const mapped = db.prepare(`
    SELECT COUNT(*) as count 
    FROM recommendations 
    WHERE dominio IS NOT NULL AND dominio != ''
  `).get() as { count: number };

    db.close();

    return {
        total: total.count,
        mapped: mapped.count,
        unmapped: total.count - mapped.count,
        byDomain,
        byType
    };
}
