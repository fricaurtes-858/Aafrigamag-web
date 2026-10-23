import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp, { PublicForm } from '@/admin/AdminApp';
import './index.css';

const path = window.location.pathname;
const Root = path === '/admin' ? AdminApp : path.startsWith('/formularios/') ? PublicForm : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
