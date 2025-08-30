import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from '@/App';
import '@/index.css';
import Header from './components/Header.jsx';
import { captureClickIdsOnce } from './lib/attribution';
captureClickIdsOnce(); // runs once on first load

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <Header />
      <App />
    </HelmetProvider>
  </React.StrictMode>
);