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
import './styles/meals.css';
import './styles/exec.css';
import './styles/exec-report.css';
import './styles/student-nav.css';
import './styles/profile.css';
import './styles/health.css';
import './styles/roomchange.css';
import './styles/deposit.css';
import './styles/mops.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
