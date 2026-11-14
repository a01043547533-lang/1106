'use client';
import { DataContext } from './data.jsx';
import { Analytics } from '@vercel/analytics/react';

const initial = { path: null, data: {}, meta: { publicConfig: { subscriptionsEnabled: false, deploymentMode: 'serverless' } } };

export default function Providers({ children }) {
  const onVercel = typeof location !== 'undefined' && !/^(localhost|127.|0.0.0.0|\[::1\])/.test(location.hostname);
  return (
    <DataContext.Provider value={initial}>
      {children}
      {onVercel && <Analytics />}
    </DataContext.Provider>
  );
}
