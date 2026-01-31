/**
 * Recommendations Observability Module
 * 
 * Tracks 4 key metrics as specified by Manager AI:
 * 1. % of queries with success=true
 * 2. % with missing_inputs
 * 3. % where Guard sanitized
 * 4. Top 10 finding patterns used
 */

// ============================================================================
// SINGLETON METRICS STORE
// ============================================================================

interface RecommendationsMetrics {
    total_queries: number;
    success_true: number;
    with_missing_inputs: number;
    guard_sanitized: number;
    finding_patterns: Map<string, number>;
    last_reset: string;
}

const metrics: RecommendationsMetrics = {
    total_queries: 0,
    success_true: 0,
    with_missing_inputs: 0,
    guard_sanitized: 0,
    finding_patterns: new Map(),
    last_reset: new Date().toISOString()
};

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

export function recordQuery(params: {
    finding_type: string;
    success: boolean;
    missing_inputs: string[];
    guard_sanitized: boolean;
}) {
    metrics.total_queries++;

    if (params.success) {
        metrics.success_true++;
    }

    if (params.missing_inputs.length > 0) {
        metrics.with_missing_inputs++;
    }

    if (params.guard_sanitized) {
        metrics.guard_sanitized++;
    }

    // Track finding pattern
    const count = metrics.finding_patterns.get(params.finding_type) || 0;
    metrics.finding_patterns.set(params.finding_type, count + 1);
}

export function recordGuardSanitization() {
    metrics.guard_sanitized++;
}

// ============================================================================
// REPORTING FUNCTIONS
// ============================================================================

export function getMetricsReport(): {
    success_rate: number;
    missing_inputs_rate: number;
    guard_sanitization_rate: number;
    top_patterns: Array<{ pattern: string; count: number }>;
    total_queries: number;
    last_reset: string;
} {
    const total = metrics.total_queries || 1; // Avoid div by zero

    const sortedPatterns = [...metrics.finding_patterns.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pattern, count]) => ({ pattern, count }));

    return {
        success_rate: (metrics.success_true / total) * 100,
        missing_inputs_rate: (metrics.with_missing_inputs / total) * 100,
        guard_sanitization_rate: (metrics.guard_sanitized / total) * 100,
        top_patterns: sortedPatterns,
        total_queries: metrics.total_queries,
        last_reset: metrics.last_reset
    };
}

export function printMetricsReport() {
    const report = getMetricsReport();

    console.log('\n📊 RECOMMENDATIONS OBSERVABILITY REPORT');
    console.log('='.repeat(50));
    console.log(`   Total queries: ${report.total_queries}`);
    console.log(`   Since: ${report.last_reset}`);
    console.log('');
    console.log(`   ✅ Success rate: ${report.success_rate.toFixed(1)}%`);
    console.log(`   ⚠️  Missing inputs rate: ${report.missing_inputs_rate.toFixed(1)}%`);
    console.log(`   🛡️  Guard sanitization rate: ${report.guard_sanitization_rate.toFixed(1)}%`);
    console.log('');
    console.log('   Top 10 finding patterns:');
    report.top_patterns.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.pattern}: ${p.count} queries`);
    });
    console.log('='.repeat(50));
}

export function resetMetrics() {
    metrics.total_queries = 0;
    metrics.success_true = 0;
    metrics.with_missing_inputs = 0;
    metrics.guard_sanitized = 0;
    metrics.finding_patterns.clear();
    metrics.last_reset = new Date().toISOString();
}

// ============================================================================
// JSON EXPORT (for dashboards)
// ============================================================================

export function exportMetricsJSON(): string {
    return JSON.stringify(getMetricsReport(), null, 2);
}
