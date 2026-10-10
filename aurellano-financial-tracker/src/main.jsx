import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme } from './assets/index.js';
import './assets/styles/index.css';
import App from './App.jsx';
import { queryClient } from './query/cache.js';

applyTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
