
import React, { useEffect, useState } from 'react';
import { X, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { PatientBatchItem } from '../utils/batch-parsers';

interface Props {
  isOpen: boolean;
  items: PatientBatchItem[];
  onClose: () => void;
  onConfirm: (validItems: PatientBatchItem[]) => void;
}

export const BatchUploadModal: React.FC<Props> = ({ isOpen, items: initialItems, onClose, onConfirm }) => {
  const [items, setItems] = useState<PatientBatchItem[]>(initialItems);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setItems(initialItems);
    }
  }, [initialItems, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (index: number, field: keyof PatientBatchItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const validItems = items.filter(item => item.os || item.paciente);
  const invalidCount = items.length - validItems.length;

  const handleConfirm = async () => {
    if (validItems.length === 0) {
      alert('⚠️ Nenhum item válido para criar. Adicione pelo menos OS ou Paciente.');
      return;
    }

    setIsCreating(true);
    try {
      await onConfirm(validItems);
      onClose();
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      alert('❌ Erro ao criar exames. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content batch-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              Exames Detectados ({items.length})
            </h2>
            <p className="text-sm text-secondary mt-1">
              Revise e edite os dados antes de criar os exames
            </p>
          </div>
          <button className="btn-icon-only" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex gap-3 p-3 bg-surface-elevated rounded border border-subtle mb-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-success" />
            <span className="text-primary font-semibold">{validItems.length}</span>
            <span className="text-secondary">válidos</span>
          </div>
          {invalidCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={16} className="text-warning" />
              <span className="text-primary font-semibold">{invalidCount}</span>
              <span className="text-secondary">incompletos</span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="batch-table-container scroll-thin">
          <table className="batch-table">
            <thead>
              <tr>
                <th style={{ minWidth: '100px' }}>OS/Pedido</th>
                <th style={{ minWidth: '200px' }}>Paciente</th>
                <th style={{ minWidth: '150px' }}>Exame</th>
                <th style={{ minWidth: '120px' }}>Data Realização</th>
                <th style={{ minWidth: '120px' }}>Data Entrega</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const isValid = item.os || item.paciente;
                return (
                  <tr key={index} className={!isValid ? 'invalid-row' : ''}>
                    <td>
                      <input
                        type="text"
                        className="batch-input"
                        value={item.os}
                        onChange={e => handleFieldChange(index, 'os', e.target.value)}
                        placeholder="OS"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="batch-input"
                        value={item.paciente}
                        onChange={e => handleFieldChange(index, 'paciente', e.target.value)}
                        placeholder="Nome do paciente"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="batch-input"
                        value={item.tipo_exame}
                        onChange={e => handleFieldChange(index, 'tipo_exame', e.target.value)}
                        placeholder="Tipo"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="batch-input"
                        value={item.data_exame}
                        onChange={e => handleFieldChange(index, 'data_exame', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="batch-input"
                        value={item.data_entrega || ''}
                        onChange={e => handleFieldChange(index, 'data_entrega', e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn-icon-only text-error hover:bg-error/10"
                        onClick={() => handleRemove(index)}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={validItems.length === 0 || isCreating}
            isLoading={isCreating}
          >
            {!isCreating && <CheckCircle size={16} />}
            Criar {validItems.length} Exame{validItems.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};
