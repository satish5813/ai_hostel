import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './styles/globals.css';
import './styles/skin.css';
import './styles/shell.css';
import './styles/workspace.css';
import './styles/allot.css';
import './styles/apps.css';
import './styles/ra.css';
import './styles/pro.css';
import './styles/student.css';
import './styles/menu.css';
import './styles/dean.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
