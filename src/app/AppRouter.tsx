
import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { PatientList } from '../components/PatientList';
import { WorkspaceLayout } from '../features/workspace/WorkspaceLayout';
import { GlobalGalleryModal } from '../components/GlobalGalleryModal';
import { Patient } from '../types/patient';

/**
 * AppRouter - Manages application view state and navigation
 * 
 * Responsibilities:
 * - View state management ('list' vs 'workspace')
 * - Patient selection
 * - Quick start functionality
 * - Sidebar and main content routing
 */
export function AppRouter() {
    const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [exitRequest, setExitRequest] = useState(false);

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setCurrentView('workspace');
    };

    const handleQuickStart = () => {
        const tempPatient: Patient = {
            id: crypto.randomUUID(),
            name: 'Paciente Avulso',
            os: `TMP-${new Date().getHours()}${new Date().getMinutes()}`,
            examType: 'Não especificado',
            status: 'processing',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            docsCount: 0,
            audioCount: 0,
            hasClinicalSummary: false
        };
        handleSelectPatient(tempPatient);
    };

    const handleChangeView = (view: 'list' | 'workspace') => {
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
