
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppSession, AttachmentDoc, AudioJob, PatientRegistrationDetails, ClinicalSummary, RadiologyChecklist, SessionTiming } from '../types';

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
  | { type: 'REMOVE_AUDIO_JOB'; payload: string }
  | { type: 'UPDATE_SESSION_TIMING'; payload: Partial<SessionTiming> }
  | { type: 'SET_CLINICAL_MARKDOWN'; payload: { markdown: string; data?: ClinicalSummary } }
  | { type: 'SET_CHECKLIST'; payload: { markdown: string; data?: RadiologyChecklist } }
  | { type: 'SET_CHECKLIST_QUERY'; payload: string };

const createInitialTiming = (): SessionTiming => ({
  attachmentEvents: []
});

const initialSession: AppSession = {
  patientId: null,
  headerImage: null,
  patient: null,
  docs: [],
  audioJobs: [],
  sessionTiming: createInitialTiming(),
  clinicalMarkdown: '',
  checklistMarkdown: '',
  checklistQuery: ''
};

const appendAttachmentEvent = (
  timing: SessionTiming | undefined,
  event: { id: string; type: 'doc' | 'audio'; at: number }
): SessionTiming => {
  const base = timing ?? createInitialTiming();
  return {
    ...base,
    openedAt: base.openedAt ?? event.at,
    firstAttachmentAt: base.firstAttachmentAt ?? event.at,
    lastAttachmentAt: event.at,
    attachmentEvents: [...(base.attachmentEvents ?? []), event]
  };
};

function sessionReducer(state: AppSession, action: SessionAction): AppSession {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return {
        ...initialSession,
        ...action.payload,
        checklistMarkdown: action.payload.checklistMarkdown ?? '',
        clinicalMarkdown: action.payload.clinicalMarkdown ?? '',
        checklistQuery: action.payload.checklistQuery ?? '',
        sessionTiming: action.payload.sessionTiming ?? createInitialTiming()
      };

    case 'CLEAR_SESSION':
      return { ...initialSession, sessionTiming: createInitialTiming() };

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
      return {
        ...state,
        docs: [...state.docs, action.payload],
        sessionTiming: appendAttachmentEvent(state.sessionTiming, {
          id: action.payload.id,
          type: 'doc',
          at: Date.now()
        })
      };

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
      return {
        ...state,
        audioJobs: [action.payload, ...state.audioJobs],
        sessionTiming: appendAttachmentEvent(state.sessionTiming, {
          id: action.payload.id,
          type: 'audio',
          at: Date.now()
        })
      };

    case 'UPDATE_AUDIO_JOB':
      return {
        ...state,
        audioJobs: state.audioJobs.map(j =>
          j.id === action.payload.id ? { ...j, ...action.payload.updates } : j
        )
      };
    case 'REMOVE_AUDIO_JOB':
      return { ...state, audioJobs: state.audioJobs.filter(j => j.id !== action.payload) };
    case 'UPDATE_SESSION_TIMING':
      return {
        ...state,
        sessionTiming: {
          ...(state.sessionTiming ?? createInitialTiming()),
          ...action.payload
        }
      };

    case 'SET_CLINICAL_MARKDOWN': {
      const shouldStartReport = !!action.payload.markdown?.trim()
        && !(state.sessionTiming?.reportStartedAt);
      return {
        ...state,
        clinicalMarkdown: action.payload.markdown,
        clinicalSummaryData: action.payload.data,
        sessionTiming: shouldStartReport
          ? {
            ...(state.sessionTiming ?? createInitialTiming()),
            reportStartedAt: Date.now()
          }
          : state.sessionTiming
      };
    }
    case 'SET_CHECKLIST':
      return {
        ...state,
        checklistMarkdown: action.payload.markdown,
        checklistData: action.payload.data
      };
    case 'SET_CHECKLIST_QUERY':
      return {
        ...state,
        checklistQuery: action.payload
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
