import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme } from './assets/index.js';
import './assets/styles/index.css';
import App from './App.jsx';

applyTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
