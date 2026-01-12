
import React, { useState } from 'react';
import { Plus, Search, RefreshCw, AlertTriangle, ScanLine, UploadCloud, Loader2, Zap } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { PatientCard } from './PatientCard';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Patient } from '../types/patient';
import { isFirebaseEnabled } from '../core/firebase';
import { extractHeaderInfo } from '../adapters/gemini-prompts';

import '../styles/patient-list.css';

interface Props {
  onSelectPatient: (patient: Patient) => void;
  onQuickStart: () => void;
}

export const PatientList: React.FC<Props> = ({ onSelectPatient, onQuickStart }) => {
  const { patients, loading, error, filter, setFilter, refresh, createPatient, deletePatient } = usePatients();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newOS, setNewOS] = useState('');
  const [newExamType, setNewExamType] = useState('');
  
  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingOCR, setIsReadingOCR] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newOS) return;
    
    setIsSubmitting(true);
    try {
      const patient = await createPatient(newName, newOS, newExamType);
      setIsCreateModalOpen(false);
      resetForm();
      
      // AUTO-OPEN
      onSelectPatient(patient); 
    } catch (err) {
      alert("Erro ao criar paciente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName(''); 
    setNewOS(''); 
    setNewExamType('');
    setIsReadingOCR(false);
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    setIsReadingOCR(true);
    try {
      // Usa a IA para extrair dados da imagem
      const data = await extractHeaderInfo(file);
      
      // Preenche o formulário automaticamente
      if (data.paciente?.valor) setNewName(data.paciente.valor);
      if (data.os?.valor) setNewOS(data.os.valor);
      if (data.tipo_exame?.valor) setNewExamType(data.tipo_exame.valor);
      
    } catch (err) {
      console.error("Erro OCR:", err);
      alert("Não foi possível ler os dados da imagem. Tente preencher manualmente.");
    } finally {
      setIsReadingOCR(false);
      // Limpa o input para permitir re-upload do mesmo arquivo se necessário
      e.target.value = '';
    }
  };

  const firebaseActive = isFirebaseEnabled();

  return (
    <div className="patient-list-container">
      {!firebaseActive && (
        <div className="mb-4 p-4 border border-yellow-500 bg-yellow-900/20 text-yellow-200 rounded flex items-center gap-2">
          <AlertTriangle size={20} />
          <div>
            <strong>Modo Offline (Memória Temporária)</strong>
            <p className="text-sm opacity-80">
              O Firebase não está configurado. Os pacientes criados serão perdidos ao recarregar a página (F5).
            </p>
          </div>
        </div>
      )}

      <div className="pl-header">
        <div>
          <h1 className="pl-title">Lista de <span>Trabalho</span></h1>
          <p className="pl-subtitle">Gerencie os exames e laudos em andamento.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onQuickStart} title="Laudo sem cadastro">
            <Zap size={16} className="mr-2 text-accent" /> Laudo Rápido
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Novo Paciente
          </Button>
        </div>
      </div>

      <div className="pl-filters">
        <button 
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`} 
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        <button 
          className={`filter-chip ${filter === 'waiting' ? 'active' : ''}`} 
          onClick={() => setFilter('waiting')}
        >
          Aguardando
        </button>
        <button 
          className={`filter-chip ${filter === 'ready' ? 'active' : ''}`} 
          onClick={() => setFilter('ready')}
        >
          Pronto p/ Laudo
        </button>
        <button 
          className={`filter-chip ${filter === 'done' ? 'active' : ''}`} 
          onClick={() => setFilter('done')}
        >
          Finalizados
        </button>
      </div>

      {loading && patients.length === 0 ? (
        <div className="text-center py-10 text-muted">Carregando pacientes...</div>
      ) : error ? (
        <div className="text-center py-10 text-error">{error}</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          Nenhum paciente encontrado neste filtro.
          <br />
          Clique em "Novo Paciente" ou "Laudo Rápido" para começar.
        </div>
      ) : (
        <div className="pl-grid">
          {patients.map(p => (
            <PatientCard 
              key={p.id} 
              patient={p} 
              onOpen={onSelectPatient} 
              onDelete={deletePatient} 
            />
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }} 
        title="Novo Paciente"
      >
        <div className="p-1">
          {/* ÁREA DE UPLOAD OCR */}
          <label className={`modal-ocr-upload ${isReadingOCR ? 'modal-ocr-loading' : ''}`}>
            {isReadingOCR ? (
              <>
                <Loader2 size={32} className="text-accent icon-spin" />
                <span className="modal-ocr-text text-accent">Lendo dados com IA...</span>
              </>
            ) : (
              <>
                <ScanLine size={32} className="text-accent" />
                <span className="modal-ocr-text">Escanear Etiqueta / Cabeçalho</span>
                <span className="modal-ocr-subtext">Clique para preencher automaticamente via OCR</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              hidden 
              onChange={handleHeaderUpload} 
              disabled={isReadingOCR}
            />
          </label>

          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nome do Paciente *</label>
              <input 
                className="form-input" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">OS / Pedido / Atendimento *</label>
              <input 
                className="form-input" 
                value={newOS} 
                onChange={e => setNewOS(e.target.value)}
                placeholder="Ex: 123456"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Exame (Opcional)</label>
              <input 
                className="form-input" 
                value={newExamType} 
                onChange={e => setNewExamType(e.target.value)}
                placeholder="Ex: TC Crânio, RX Tórax"
              />
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={!newName || !newOS || isReadingOCR}>
                Criar Ficha
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
