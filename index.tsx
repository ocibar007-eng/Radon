
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/app/App';
import { initDebugBridge } from './src/utils/debug-bridge';

// Initialize the debug bridge to capture logs
initDebugBridge();

// CSS Order is critical: Tokens first, then animations, then global layout, then components
import './src/styles/design-tokens.css';
import './src/styles/animations.css';
import './src/styles/layout.css';
import './src/styles/components.css';
import './src/styles/patient-list.css';
import './src/styles/documents.css';
import './src/styles/audio.css';
import './src/styles/markdown.css';
import './src/styles/clinical.css';

// Feature modules
import './src/features/ocr-batch/styles/ocr-batch.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
