
import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { PatientList } from '../components/PatientList';
import { WorkspaceLayout } from '../features/workspace/WorkspaceLayout';
import { OcrBatchPage } from '../features/ocr-batch';
import { GlobalGalleryModal } from '../components/GlobalGalleryModal';
import { Patient } from '../types/patient';
import { useBackgroundAudioTranscription } from '../hooks/useBackgroundAudioTranscription';

/**
 * AppRouter - Manages application view state and navigation
 * 
 * Responsibilities:
 * - View state management ('list' vs 'workspace' vs 'ocr-batch')
 * - Patient selection
 * - Quick start functionality
 * - Sidebar and main content routing
 */
export function AppRouter() {
    const [currentView, setCurrentView] = useState<'list' | 'workspace' | 'ocr-batch'>('list');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [exitRequest, setExitRequest] = useState(false);

    // Keep audio transcriptions progressing even outside the workspace view.
    useBackgroundAudioTranscription({
        activePatientId: selectedPatient?.id ?? null,
        allowActivePatient: currentView !== 'workspace'
    });

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setCurrentView('workspace');
    };

    const handleQuickStart = () => {
        const tempPatient: Patient = {
            id: `tmp_${crypto.randomUUID()}`,
            name: 'Paciente Avulso',
            os: `TMP-${new Date().getHours()}${new Date().getMinutes()}`,
            examType: 'Não especificado',
            status: 'processing',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
            docsCount: 0,
            audioCount: 0,
            hasClinicalSummary: false
        };
        handleSelectPatient(tempPatient);
    };

    const handleChangeView = (view: 'list' | 'workspace' | 'ocr-batch') => {
        if (view === 'list' && currentView === 'workspace') {
            setExitRequest(true);
            return;
        }
        setCurrentView(view);
    };

    return (
        <div className="app-shell">
            <Sidebar
                currentView={currentView}
                onChangeView={handleChangeView}
                onQuickStart={handleQuickStart}
                hasActivePatient={!!selectedPatient}
            />

            <main className="shell-main scroll-thin">
                {currentView === 'list' ? (
                    <PatientList
                        onSelectPatient={handleSelectPatient}
                        onQuickStart={handleQuickStart}
                    />
                ) : currentView === 'ocr-batch' ? (
                    <OcrBatchPage onBack={() => setCurrentView('list')} />
                ) : (
                    <WorkspaceLayout
                        patient={selectedPatient}
                        exitRequest={exitRequest}
                        onExit={() => {
                            setCurrentView('list');
                            setExitRequest(false);
                        }}
                        onCancelExit={() => setExitRequest(false)}
                    />
                )}
            </main>

            <GlobalGalleryModal />
        </div>
    );
}
