/**
 * Main App Component
 *
 * Root component that sets up routing and global providers.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Editor } from './components/Editor';
import { HelpPage } from './components/HelpPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { ConsentBanner } from './components/ConsentBanner';

function App() {
  // Use selectors to subscribe only to needed state
  const theme = useAppStore((state) => state.theme);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:projectId" element={<Editor />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>

      {/* GDPR Consent Banner */}
      <ConsentBanner />

      {/* Global Toast Container - outside ErrorBoundary to prevent toast errors from crashing the app */}
      <ToastContainer />
    </>
  );
}

export default App;
