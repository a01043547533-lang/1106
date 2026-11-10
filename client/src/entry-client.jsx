import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { DataContext } from './data.jsx';
import './styles.css';
// Vercel Analytics: 쿠키·개인 식별 없이 페이지뷰만 센다. Vercel 밖(로컬)에서는 아무것도 보내지 않는다.
import { Analytics } from '@vercel/analytics/react';

const initial = { path: null, data: {}, meta: { publicConfig: { subscriptionsEnabled: false, deploymentMode: 'serverless' } } };
const tree = (
  <React.StrictMode>
    <DataContext.Provider value={initial}>
      <BrowserRouter>
        <App />
        {typeof location !== 'undefined' && !/^(localhost|127.|0.0.0.0|[::1])/.test(location.hostname) && <Analytics />}
      </BrowserRouter>
    </DataContext.Provider>
  </React.StrictMode>
);

const root = document.getElementById('root');
createRoot(root).render(tree);
