import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App.jsx';
import { DataContext } from './data.jsx';

// url: 요청 주소 / initial: { path, status, meta, data } (server/loaders.js가 만든다)
export function render(url, initial) {
  const appHtml = renderToString(
    <React.StrictMode>
      <DataContext.Provider value={initial}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </DataContext.Provider>
    </React.StrictMode>
  );
  return { appHtml };
}
