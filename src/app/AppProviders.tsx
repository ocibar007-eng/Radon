
import React from 'react';
import { SessionProvider } from '../context/SessionContext';
import { GalleryProvider } from '../context/GalleryContext';

interface AppProvidersProps {
    children: React.ReactNode;
}

/**
 * AppProviders - Aggregates all context providers for the application
 * 
 * This component wraps all global contexts in a single place,
 * making the App.tsx cleaner and easier to maintain.
 */
export function AppProviders({ children }: AppProvidersProps) {
    return (
        <SessionProvider>
            <GalleryProvider>
                {children}
            </GalleryProvider>
        </SessionProvider>
    );
}
