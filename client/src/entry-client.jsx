import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { DataContext } from './data.jsx';
import './styles.css';

const initial = { path: null, data: {}, meta: { publicConfig: { subscriptionsEnabled: false, deploymentMode: 'serverless' } } };
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
createRoot(root).render(tree);
