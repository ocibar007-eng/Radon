
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppSession, AttachmentDoc, AudioJob, PatientRegistrationDetails, ClinicalSummary, RadiologyChecklist } from '../types';

// Actions definition
type SessionAction =
  | { type: 'RESTORE_SESSION'; payload: AppSession }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_HEADER'; payload: AttachmentDoc | null }
  | { type: 'SET_PATIENT'; payload: PatientRegistrationDetails }
  | { type: 'UPDATE_PATIENT'; payload: Partial<PatientRegistrationDetails> }
  | { type: 'SET_PATIENT_ID'; payload: string | null }
  | { type: 'ADD_DOC'; payload: AttachmentDoc }
  | { type: 'UPDATE_DOC'; payload: { id: string; updates: Partial<AttachmentDoc> } }
  | { type: 'REMOVE_DOC'; payload: string }
  | { type: 'ADD_AUDIO_JOB'; payload: AudioJob }
  | { type: 'UPDATE_AUDIO_JOB'; payload: { id: string; updates: Partial<AudioJob> } }
  | { type: 'SET_CLINICAL_MARKDOWN'; payload: { markdown: string; data?: ClinicalSummary } }
  | { type: 'SET_CHECKLIST'; payload: { markdown: string; data?: RadiologyChecklist } };

const initialSession: AppSession = {
  patientId: null,
  headerImage: null,
  patient: null,
  docs: [],
  audioJobs: [],
  clinicalMarkdown: '',
  checklistMarkdown: ''
};

function sessionReducer(state: AppSession, action: SessionAction): AppSession {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return {
        ...initialSession,
        ...action.payload,
        checklistMarkdown: action.payload.checklistMarkdown ?? '',
        clinicalMarkdown: action.payload.clinicalMarkdown ?? ''
      };

    case 'CLEAR_SESSION':
      return { ...initialSession };

    case 'SET_HEADER':
      return { ...state, headerImage: action.payload };

    case 'SET_PATIENT':
      return { ...state, patient: action.payload };

    case 'UPDATE_PATIENT':
      return {
        ...state,
        patient: state.patient
          ? { ...state.patient, ...action.payload }
          : action.payload as PatientRegistrationDetails
      };

    case 'SET_PATIENT_ID':
      return { ...state, patientId: action.payload };

    case 'ADD_DOC':
      return { ...state, docs: [...state.docs, action.payload] };

    case 'UPDATE_DOC':
      return {
        ...state,
        docs: state.docs.map(d =>
          d.id === action.payload.id ? { ...d, ...action.payload.updates } : d
        )
      };

    case 'REMOVE_DOC':
      return { ...state, docs: state.docs.filter(d => d.id !== action.payload) };

    case 'ADD_AUDIO_JOB':
      return { ...state, audioJobs: [action.payload, ...state.audioJobs] };

    case 'UPDATE_AUDIO_JOB':
      return {
        ...state,
        audioJobs: state.audioJobs.map(j =>
          j.id === action.payload.id ? { ...j, ...action.payload.updates } : j
        )
      };

    case 'SET_CLINICAL_MARKDOWN':
      return {
        ...state,
        clinicalMarkdown: action.payload.markdown,
        clinicalSummaryData: action.payload.data
      };
    case 'SET_CHECKLIST':
      return {
        ...state,
        checklistMarkdown: action.payload.markdown,
        checklistData: action.payload.data
      };

    default:
      return state;
  }
}

const SessionContext = createContext<{
  session: AppSession;
  dispatch: React.Dispatch<SessionAction>;
} | null>(null);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);

  return (
    <SessionContext.Provider value={{ session, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
