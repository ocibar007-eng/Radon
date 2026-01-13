
import React from 'react';
import { AppProviders } from './AppProviders';
import { AppRouter } from './AppRouter';

/**
 * App - Clean orchestrator for the Radon application
 * 
 * This is the entry point that:
 * 1. Wraps the application in context providers (AppProviders)
 * 2. Delegates routing and view management to AppRouter
 * 
 * All business logic has been extracted to:
 * - AppProviders: Context aggregation
 * - AppRouter: View state and navigation
 * - WorkspaceLayout: Editor interface
 */
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
