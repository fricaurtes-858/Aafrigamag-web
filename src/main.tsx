import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp, { PublicForm } from '@/admin/AdminApp';
import NewsPages from '@/pages/NewsPages';
import DocumentsPage from '@/pages/DocumentsPage';
import './index.css';

const path = window.location.pathname;
const normalized = path.replace(/^\/+|\/+$/g, '');
const first = normalized.split('/')[0];

const Root =
  first === 'admin'
    ? AdminApp
    : first === 'formularios'
    ? PublicForm
    : first === 'noticias'
    ? NewsPages
    : first === 'documentos'
    ? DocumentsPage
    : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
