import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebaseSync } from './services/firebaseSync';

// Inicia a sincronização com o Firebase Firestore
if (typeof window !== 'undefined') {
  initFirebaseSync().catch((err) => console.warn('[FirebaseSync] Erro na inicialização:', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

