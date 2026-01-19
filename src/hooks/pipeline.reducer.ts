
import { PipelineState, PipelineAction, getItemId, DEFAULT_PIPELINE_CONFIG } from './pipeline.types';

/**
 * Pure reducer for pipeline state machine
 * 
 * All state transitions are explicit and testable.
 * No side effects - just state in, state out.
 */
export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
    switch (action.type) {
        case 'ENQUEUE': {
            // Deduplicate: only add items not already in queue or processing
            const newItems = action.items.filter(item => {
                const id = getItemId(item);
                const inQueue = state.queue.some(q => getItemId(q) === id);
                const existing = state.processing.get(id);
                const inProcessing = existing
                    ? (existing.status === 'processing' || existing.status === 'retrying')
                    : false;
                return !inQueue && !inProcessing;
            });

            if (newItems.length === 0) return state;

            return {
                ...state,
                queue: [...state.queue, ...newItems],
                status: state.status === 'idle' ? 'active' : state.status
            };
        }

        case 'START_JOB': {
            const { itemId } = action;
            const itemIndex = state.queue.findIndex(item => getItemId(item) === itemId);

            if (itemIndex === -1) {
                console.warn(`[Pipeline] Cannot start job ${itemId}: not in queue`);
                return state;
            }

            const item = state.queue[itemIndex];
            const existingJob = state.processing.get(itemId);

            // Create or update job
            const newProcessing = new Map(state.processing);
            newProcessing.set(itemId, {
                item,
                status: 'processing',
                attempts: (existingJob?.attempts || 0) + 1,
                startedAt: Date.now()
            });

            // Remove from queue
            const newQueue = [...state.queue];
            newQueue.splice(itemIndex, 1);

            return {
                ...state,
                queue: newQueue,
                processing: newProcessing
            };
        }

        case 'JOB_SUCCESS': {
            const { itemId, result } = action;
            const job = state.processing.get(itemId);

            if (!job) {
                console.warn(`[Pipeline] Job ${itemId} not found for success`);
                return state;
            }

            const newProcessing = new Map(state.processing);
            newProcessing.set(itemId, {
                ...job,
                status: 'success',
                completedAt: Date.now(),
                result
            });

            // Clear any previous errors for this item
            const newErrors = new Map(state.errors);
            newErrors.delete(itemId);

            return {
                ...state,
                processing: newProcessing,
                errors: newErrors,
                status: state.queue.length === 0 && newProcessing.size === 1 ? 'idle' : state.status
            };
        }

        case 'JOB_ERROR': {
            const { itemId, error } = action;
            const job = state.processing.get(itemId);

            if (!job) {
                console.warn(`[Pipeline] Job ${itemId} not found for error`);
                return state;
            }

            const { maxRetries } = DEFAULT_PIPELINE_CONFIG;

            // Check if we should retry
            if (job.attempts < maxRetries) {
                // Mark as retrying and re-enqueue with priority (front of queue)
                const newProcessing = new Map(state.processing);
                newProcessing.set(itemId, {
                    ...job,
                    status: 'retrying',
                    error
                });

                return {
                    ...state,
                    processing: newProcessing,
                    queue: [job.item, ...state.queue] // Priority: front of queue
                };
            }

            // Max retries exceeded - move to permanent errors
            const newProcessing = new Map(state.processing);
            newProcessing.delete(itemId);

            const newErrors = new Map(state.errors);
            newErrors.set(itemId, {
                error,
                attempts: job.attempts,
                item: job.item
            });

            console.error(`[Pipeline] Job ${itemId} failed permanently after ${job.attempts} attempts:`, error);

            return {
                ...state,
                processing: newProcessing,
                errors: newErrors,
                status: state.queue.length === 0 && newProcessing.size === 0 ? 'idle' : state.status
            };
        }

        case 'RETRY_JOB': {
            const { itemId } = action;
            const errorInfo = state.errors.get(itemId);

            if (!errorInfo) {
                console.warn(`[Pipeline] Cannot retry ${itemId}: not in errors`);
                return state;
            }

            // Remove from errors and re-enqueue
            const newErrors = new Map(state.errors);
            newErrors.delete(itemId);

            return {
                ...state,
                errors: newErrors,
                queue: [...state.queue, errorInfo.item],
                status: 'active'
            };
        }

        case 'PAUSE': {
            return {
                ...state,
                status: 'paused'
            };
        }

        case 'RESUME': {
            return {
                ...state,
                status: state.queue.length > 0 ? 'active' : 'idle'
            };
        }

        case 'CLEAR_COMPLETED': {
            // Remove successful jobs from processing map to prevent memory leak
            const newProcessing = new Map(state.processing);
            Array.from(newProcessing.entries()).forEach(([id, job]) => {
                if (job.status === 'success' && job.completedAt) {
                    const age = Date.now() - job.completedAt;
                    if (age > 60000) { // Keep for 1 minute for debugging
                        newProcessing.delete(id);
                    }
                }
            });

            return {
                ...state,
                processing: newProcessing
            };
        }

        default:
            return state;
    }
}

/**
 * Initial state factory
 */
export function createInitialState(): PipelineState {
    return {
        queue: [],
        processing: new Map(),
        status: 'idle',
        errors: new Map()
    };
}
