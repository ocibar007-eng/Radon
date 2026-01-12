
import React, { useState, useMemo } from 'react';
import { Search, UploadCloud } from 'lucide-react';
import { ReportGroupCard } from './ReportGroupCard';
import { ReportGroup } from '../../utils/grouping';
import { Button } from '../../components/ui/Button';

interface Props {
  groups: ReportGroup[];
  onRemoveGroup: (groupId: string) => void;
  onSplitGroup?: (groupId: string, splitStartPage: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PreviousReportsTab: React.FC<Props> = ({ groups, onRemoveGroup, onSplitGroup, onUpload }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    
    const term = searchTerm.toLowerCase();
    
    return groups.filter(group => {
      if (group.title.toLowerCase().includes(term)) return true;
      if (group.type?.toLowerCase().includes(term)) return true;
      if (group.date?.toLowerCase().includes(term)) return true;
      
      return group.docs.some(doc => 
        doc.verbatimText?.toLowerCase().includes(term) ||
        doc.source.toLowerCase().includes(term)
      );
    });
  }, [groups, searchTerm]);

  return (
    <div className="animate-fade-in">
      {/* Search & Actions Bar */}
      <div className="flex gap-2 mb-4">
        <div className="search-container flex-1 mb-0">
            <Search className="search-icon" size={16} />
            <input 
            type="text" 
            className="search-input"
            placeholder="Buscar em laudos prévios (tipo, data, conteúdo)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <label>
            <Button as="span" variant="secondary" className="cursor-pointer h-full">
                <UploadCloud size={16} className="mr-2" />
                Adicionar Laudo
            </Button>
            <input 
                type="file" 
                multiple 
                hidden 
                accept="image/*,application/pdf" 
                onChange={onUpload} 
            />
        </label>
      </div>

      <div className="reports-grid">
        {filteredGroups.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? 'Nenhum laudo encontrado para sua busca.' : 'Nenhum laudo prévio identificado.'}
          </div>
        ) : (
          filteredGroups.map(group => (
            <ReportGroupCard 
              key={group.id} 
              group={group} 
              onRemove={() => onRemoveGroup(group.id)}
              onSplitGroup={onSplitGroup}
            />
          ))
        )}
      </div>
    </div>
  );
};
