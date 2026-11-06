import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { DataContext } from './data.jsx';
import './styles.css';

const initial = window.__DATA__ || { path: null, data: {}, meta: {} };
const tree = (
  <React.StrictMode>
    <DataContext.Provider value={initial}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </DataContext.Provider>
  </React.StrictMode>
);

const root = document.getElementById('root');
// 서버가 그린 HTML이 있으면 hydrate, 폴백(빈 HTML)이면 새로 그린다.
if (root.hasChildNodes()) hydrateRoot(root, tree);
else createRoot(root).render(tree);
