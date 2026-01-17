import React from 'react';
import { FileX } from 'lucide-react';

export const EmptyPageTemplate: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-secondary h-full min-h-[300px]">
            <div className="bg-surface-elevated p-4 rounded-full mb-4 opacity-50">
                <FileX size={32} />
            </div>
            <h3 className="text-sm font-medium mb-2">Página Vazia</h3>
            <p className="text-xs text-tertiary text-center max-w-[200px]">
                Esta página foi identificada como vazia ou sem conteúdo relevante.
            </p>
        </div>
    );
};
