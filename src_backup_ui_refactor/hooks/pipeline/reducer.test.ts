
import { describe, it, expect } from 'vitest';
import { pipelineReducer, createInitialState } from './pipeline.reducer';
import { PipelineState, ProcessingQueueItem } from './pipeline.types';

describe('pipelineReducer - Safety Suite', () => {
    // Helper to create mock queue items
    const createDocItem = (id: string): ProcessingQueueItem => ({
        type: 'doc',
        docId: id
    });

    const createAudioItem = (id: string): ProcessingQueueItem => ({
        type: 'audio',
        jobId: id
    });

    describe('1. Deduplication', () => {
        it('should not duplicate items with same ID in queue', () => {
            const state = createInitialState();
            const item = createDocItem('doc-123');

            // First enqueue
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            expect(newState.queue).toHaveLength(1);

            // Second enqueue (duplicate)
            newState = pipelineReducer(newState, { type: 'ENQUEUE', items: [item] });
            expect(newState.queue).toHaveLength(1);
            expect(newState.queue[0]).toEqual(item);
        });

        it('should not enqueue item already in processing', () => {
            const state = createInitialState();
            const item = createDocItem('doc-456');

            // Enqueue and start processing
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-456' });
            expect(newState.queue).toHaveLength(0);
            expect(newState.processing.has('doc:doc-456')).toBe(true);

            // Try to enqueue again while processing
            newState = pipelineReducer(newState, { type: 'ENQUEUE', items: [item] });
            expect(newState.queue).toHaveLength(0); // Should not add to queue
        });

        it('should allow different items with different IDs', () => {
            const state = createInitialState();
            const item1 = createDocItem('doc-1');
            const item2 = createDocItem('doc-2');

            const newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item1, item2] });
            expect(newState.queue).toHaveLength(2);
        });
    });

    describe('2. Retry Logic', () => {
        it('should retry failed job with attempts < maxRetries', () => {
            const state = createInitialState();
            const item = createDocItem('doc-retry');

            // Enqueue and start
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-retry' });

            const job = newState.processing.get('doc:doc-retry');
            expect(job?.attempts).toBe(1);
            expect(job?.status).toBe('processing');

            // First failure (attempts: 1 < 3)
            const error = new Error('Network failure');
            newState = pipelineReducer(newState, { type: 'JOB_ERROR', itemId: 'doc:doc-retry', error });

            // Check status changed to 'retrying'
            const retriedJob = newState.processing.get('doc:doc-retry');
            expect(retriedJob?.status).toBe('retrying');
            expect(retriedJob?.attempts).toBe(1); // Attempts don't increment until next START_JOB
            expect(retriedJob?.error).toBe(error);

            // Item should be back in queue (front)
            expect(newState.queue).toHaveLength(1);
            expect(newState.queue[0]).toEqual(item);

            // Should not be in errors
            expect(newState.errors.has('doc:doc-retry')).toBe(false);
        });

        it('should increment attempts on retry START_JOB', () => {
            const state = createInitialState();
            const item = createDocItem('doc-increment');

            // First attempt
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-increment' });
            expect(newState.processing.get('doc:doc-increment')?.attempts).toBe(1);

            // Fail and retry
            newState = pipelineReducer(newState, { type: 'JOB_ERROR', itemId: 'doc:doc-increment', error: new Error('Fail 1') });

            // Second attempt
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-increment' });
            expect(newState.processing.get('doc:doc-increment')?.attempts).toBe(2);
        });
    });

    describe('3. Hard Failure (Max Retries)', () => {
        it('should move job to errors after max retries exceeded', () => {
            const state = createInitialState();
            const item = createDocItem('doc-hard-fail');

            // Simulate 3 failed attempts
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });

            for (let i = 1; i <= 3; i++) {
                newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-hard-fail' });
                expect(newState.processing.get('doc:doc-hard-fail')?.attempts).toBe(i);

                newState = pipelineReducer(newState, {
                    type: 'JOB_ERROR',
                    itemId: 'doc:doc-hard-fail',
                    error: new Error(`Failure ${i}`)
                });
            }

            // After 3rd failure, should be in errors
            expect(newState.errors.has('doc:doc-hard-fail')).toBe(true);
            expect(newState.processing.has('doc:doc-hard-fail')).toBe(false);
            expect(newState.queue).toHaveLength(0);

            const errorInfo = newState.errors.get('doc:doc-hard-fail');
            expect(errorInfo?.attempts).toBe(3);
            expect(errorInfo?.item).toEqual(item);
            expect(errorInfo?.error.message).toBe('Failure 3');
        });

        it('should transition to idle after permanent failure with empty queue', () => {
            const state = createInitialState();
            const item = createDocItem('doc-idle-fail');

            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            expect(newState.status).toBe('active');

            // 3 failures
            for (let i = 1; i <= 3; i++) {
                newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-idle-fail' });
                newState = pipelineReducer(newState, { type: 'JOB_ERROR', itemId: 'doc:doc-idle-fail', error: new Error('Fail') });
            }

            // Should transition to idle (no queue, no processing)
            expect(newState.status).toBe('idle');
        });
    });

    describe('4. Concurrency Safety', () => {
        it('should not start job if item not in queue', () => {
            const state = createInitialState();

            // Try to start a job that was never enqueued
            const newState = pipelineReducer(state, { type: 'START_JOB', itemId: 'doc:nonexistent' });

            // State should remain unchanged
            expect(newState.queue).toHaveLength(0);
            expect(newState.processing.size).toBe(0);
        });

        it('should properly transition item from queue to processing', () => {
            const state = createInitialState();
            const item = createDocItem('doc-transition');

            // Enqueue
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            expect(newState.queue).toHaveLength(1);
            expect(newState.processing.size).toBe(0);

            // Start job
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-transition' });
            expect(newState.queue).toHaveLength(0); // Removed from queue
            expect(newState.processing.size).toBe(1); // Added to processing
            expect(newState.processing.has('doc:doc-transition')).toBe(true);

            const job = newState.processing.get('doc:doc-transition');
            expect(job?.status).toBe('processing');
            expect(job?.item).toEqual(item);
        });

        it('should handle multiple items in queue sequentially', () => {
            const state = createInitialState();
            const items = [
                createDocItem('doc-1'),
                createDocItem('doc-2'),
                createDocItem('doc-3')
            ];

            // Enqueue all
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items });
            expect(newState.queue).toHaveLength(3);

            // Start first job
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-1' });
            expect(newState.queue).toHaveLength(2);
            expect(newState.processing.has('doc:doc-1')).toBe(true);
            expect(newState.processing.has('doc:doc-2')).toBe(false);
        });
    });

    describe('5. Success Handling', () => {
        it('should mark job as success and keep in processing', () => {
            const state = createInitialState();
            const item = createDocItem('doc-success');

            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-success' });

            const result = { text: 'OCR result' };
            newState = pipelineReducer(newState, { type: 'JOB_SUCCESS', itemId: 'doc:doc-success', result });

            const job = newState.processing.get('doc:doc-success');
            expect(job?.status).toBe('success');
            expect(job?.result).toEqual(result);
            expect(job?.completedAt).toBeDefined();
        });

        it('should clear errors on success', () => {
            const state = createInitialState();
            const item = createDocItem('doc-clear-error');

            // Enqueue, fail once (to create error), then succeed
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-clear-error' });
            newState = pipelineReducer(newState, { type: 'JOB_ERROR', itemId: 'doc:doc-clear-error', error: new Error('Temp fail') });

            // Retry and succeed
            newState = pipelineReducer(newState, { type: 'START_JOB', itemId: 'doc:doc-clear-error' });
            newState = pipelineReducer(newState, { type: 'JOB_SUCCESS', itemId: 'doc:doc-clear-error' });

            expect(newState.errors.has('doc:doc-clear-error')).toBe(false);
        });
    });

    describe('6. Pause/Resume', () => {
        it('should pause and resume pipeline', () => {
            const state = createInitialState();
            const item = createDocItem('doc-pause');

            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            expect(newState.status).toBe('active');

            newState = pipelineReducer(newState, { type: 'PAUSE' });
            expect(newState.status).toBe('paused');

            newState = pipelineReducer(newState, { type: 'RESUME' });
            expect(newState.status).toBe('active');
        });
    });

    describe('7. Group Analysis Items', () => {
        it('should handle group analysis items with unique ID generation', () => {
            const state = createInitialState();
            const item: ProcessingQueueItem = {
                type: 'group_analysis',
                docIds: ['doc-1', 'doc-2', 'doc-3'],
                fullText: 'Combined text'
            };

            // Enqueue
            let newState = pipelineReducer(state, { type: 'ENQUEUE', items: [item] });
            expect(newState.queue).toHaveLength(1);

            // Try to enqueue same group (different order should still dedupe)
            const itemReordered: ProcessingQueueItem = {
                type: 'group_analysis',
                docIds: ['doc-3', 'doc-1', 'doc-2'], // Different order
                fullText: 'Combined text'
            };
            newState = pipelineReducer(newState, { type: 'ENQUEUE', items: [itemReordered] });
            expect(newState.queue).toHaveLength(1); // Should deduplicate based on sorted IDs
        });
    });
});
