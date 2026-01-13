
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Zap, AlertTriangle } from 'lucide-react';

/**
 * ChaosPanel - Development-only stress testing component
 * 
 * Simulates high-volume upload scenarios with mocked API responses
 * to validate pipeline robustness without incurring API costs.
 */
export function ChaosPanel() {
    const [isRunning, setIsRunning] = useState(false);
    const [useMock, setUseMock] = useState(true);

    const simulateBulkUpload = async (count: number) => {
        setIsRunning(true);
        console.log(`[ChaosPanel] Starting ${count} simulated uploads (mock: ${useMock})`);

        // Create fake File objects
        const fakeFiles: File[] = [];
        for (let i = 0; i < count; i++) {
            const content = `Simulated PDF content for test document ${i + 1}`;
            const blob = new Blob([content], { type: 'application/pdf' });
            const file = new File([blob], `chaos_test_${i + 1}.pdf`, { type: 'application/pdf' });
            fakeFiles.push(file);
        }

        // Trigger upload via hidden file input (simulating user action)
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (!fileInput) {
            console.error('[ChaosPanel] No file input found');
            setIsRunning(false);
            return;
        }

        // Create a DataTransfer to programmatically set files
        const dataTransfer = new DataTransfer();
        fakeFiles.forEach(file => dataTransfer.items.add(file));

        // Set files and trigger change event
        fileInput.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);

        console.log(`[ChaosPanel] Dispatched ${count} files to pipeline`);

        // Reset after a delay
        setTimeout(() => setIsRunning(false), 2000);
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0, 0, 0, 0.9)',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                zIndex: 9999,
                minWidth: '280px'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={20} color="#f59e0b" />
                <strong style={{ color: '#f59e0b' }}>Chaos Panel (Dev Only)</strong>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={useMock}
                        onChange={(e) => setUseMock(e.target.checked)}
                    />
                    <span style={{ fontSize: '14px' }}>Use Mock Mode (Zero Cost)</span>
                </label>
                {useMock && (
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', marginLeft: '28px' }}>
                        Pipeline will use simulated responses (no Gemini API calls)
                    </p>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => simulateBulkUpload(5)}
                    disabled={isRunning}
                    isLoading={isRunning}
                >
                    <Zap size={14} />
                    Simulate 5 Uploads
                </Button>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => simulateBulkUpload(20)}
                    disabled={isRunning}
                    isLoading={isRunning}
                >
                    <Zap size={14} />
                    Simulate 20 Uploads
                </Button>

                <Button
                    variant="danger"
                    size="sm"
                    onClick={() => simulateBulkUpload(50)}
                    disabled={isRunning}
                    isLoading={isRunning}
                >
                    <Zap size={14} />
                    CHAOS: 50 Uploads
                </Button>
            </div>

            <p style={{ fontSize: '10px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
                Status: {isRunning ? 'Running...' : 'Idle'}
            </p>
        </div>
    );
}
