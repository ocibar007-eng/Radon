
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AttachmentDoc } from '../types';

interface GalleryContextType {
  isOpen: boolean;
  currentDoc: AttachmentDoc | null;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalDocs: number;
  
  openGallery: (docs: AttachmentDoc[], initialDocId?: string) => void;
  closeGallery: () => void;
  nextImage: () => void;
  prevImage: () => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export const GalleryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState<AttachmentDoc[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openGallery = useCallback((items: AttachmentDoc[], initialDocId?: string) => {
    if (!items.length) return;
    setDocs(items);
    
    const index = initialDocId ? items.findIndex(d => d.id === initialDocId) : 0;
    setCurrentIndex(index >= 0 ? index : 0);
    setIsOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
        setDocs([]);
        setCurrentIndex(0);
    }, 200); // Limpa após animação de saída (opcional)
  }, []);

  const nextImage = useCallback(() => {
    setCurrentIndex(prev => (prev < docs.length - 1 ? prev + 1 : prev));
  }, [docs.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const value: GalleryContextType = {
    isOpen,
    currentDoc: docs[currentIndex] || null,
    hasPrev: currentIndex > 0,
    hasNext: currentIndex < docs.length - 1,
    currentIndex: currentIndex + 1, // 1-based para display
    totalDocs: docs.length,
    openGallery,
    closeGallery,
    nextImage,
    prevImage
  };

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGallery must be used within GalleryProvider');
  return ctx;
};
