/**
 * Main Entry Point
 *
 * Initializes the application, database, and React root.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDatabase } from './lib/storage/db';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  });
}

// Initialize database before rendering app
async function init() {
  try {
    await initializeDatabase();
    console.log('[App] Database initialized successfully');

    // Render app
    const root = document.getElementById('root');
    if (!root) throw new Error('Root element not found');

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('[App] Initialization failed:', error);

    // Show error to user
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #0A0A0B;
          color: #FAFAFA;
          font-family: sans-serif;
          text-align: center;
          padding: 20px;
        ">
          <div>
            <h1 style="color: #EF4444; margin-bottom: 20px;">Failed to Initialize</h1>
            <p style="color: #A1A1AA; margin-bottom: 20px;">
              ${error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <button
              onclick="window.location.reload()"
              style="
                background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
              "
            >
              Reload Page
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Start initialization
init();
