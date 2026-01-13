
export type { ProcessingQueueItem } from '../types';

/**
 * Job status in the pipeline processing lifecycle
 */
export type JobStatus = 'pending' | 'processing' | 'retrying' | 'success' | 'error';

/**
 * Processing job details tracked in the state machine
 */
export interface ProcessingJob {
    item: ProcessingQueueItem;
    status: JobStatus;
    attempts: number;
    startedAt?: number;
    completedAt?: number;
    error?: Error;
    result?: any; // Result from pipeline processing (OCR, analysis, etc.)
}

/**
 * Pipeline execution state
 */
export type PipelineExecutionStatus = 'idle' | 'active' | 'paused';

/**
 * Centralized state for the pipeline state machine
 */
export interface PipelineState {
    /** Queue of items waiting to be processed */
    queue: ProcessingQueueItem[];

    /** Map of currently processing or recently processed jobs */
    processing: Map<string, ProcessingJob>;

    /** Overall pipeline execution status */
    status: PipelineExecutionStatus;

    /** Permanent errors (jobs that exceeded max retries) */
    errors: Map<string, { error: Error; attempts: number; item: ProcessingQueueItem }>;
}

/**
 * Actions that can transition the pipeline state
 */
export type PipelineAction =
    | { type: 'ENQUEUE'; items: ProcessingQueueItem[] }
    | { type: 'START_JOB'; itemId: string }
    | { type: 'JOB_SUCCESS'; itemId: string; result?: any }
    | { type: 'JOB_ERROR'; itemId: string; error: Error }
    | { type: 'RETRY_JOB'; itemId: string }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'CLEAR_COMPLETED' }; // Clean up successful jobs from processing map

/**
 * Configuration for pipeline behavior
 */
export interface PipelineConfig {
    /** Maximum number of concurrent jobs */
    maxConcurrency: number;

    /** Maximum retry attempts before marking as permanent error */
    maxRetries: number;

    /** Exponential backoff base delay in ms */
    retryDelayMs: number;
}

/**
 * Helper to generate a unique ID for queue items
 */
export function getItemId(item: ProcessingQueueItem): string {
    if (item.type === 'group_analysis') {
        return `group:${item.docIds?.sort().join('|')}`;
    }
    return `${item.type}:${item.docId || item.jobId}`;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
    maxConcurrency: 1, // Process one at a time for now (sequential)
    maxRetries: 3,
    retryDelayMs: 1000 // 1s, 2s, 4s backoff
};
