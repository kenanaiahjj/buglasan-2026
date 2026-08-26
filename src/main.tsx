import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Self-hosted variable webfont. Fontsource ships unicode-range blocks, so
// only the latin subset is fetched for this content.
import '@fontsource-variable/archivo/wght.css';

// Preload the sans-serif face above the fold with its hashed build URL.
import archivoLatin from '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2?url';

import './styles.css';

for (const href of [archivoLatin]) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
