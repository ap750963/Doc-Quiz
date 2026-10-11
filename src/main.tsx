import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Automatically register PWA service worker for offline caching & standalone install
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
