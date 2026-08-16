import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const scheduleWebVitals = () => {
  void import('./src/reportWebVitals').then(({ reportWebVitals }) => reportWebVitals());
};

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(scheduleWebVitals, { timeout: 1_000 });
} else {
  globalThis.setTimeout(scheduleWebVitals, 1_000);
}
