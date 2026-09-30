import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@hanacg/design-tokens/theme.css';
import '@hanacg/ui/styles.css';
import './styles.css';
import { App } from './App';
import { migrateCatalogIds } from './catalog/migrate-ids';

void migrateCatalogIds().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
