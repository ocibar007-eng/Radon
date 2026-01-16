
import React from 'react';
import { AppProviders } from './AppProviders';
import { AppRouter } from './AppRouter';
import { DebugPanel } from '../components/DebugPanel';

/**
 * App - Clean orchestrator for the Radon application
 */
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
      <DebugPanel />
    </AppProviders>
  );
}
