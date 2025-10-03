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
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';

function App() {
  const { theme, setIsOffline } = useAppStore();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global Toast Container */}
      <ToastContainer />
    </ErrorBoundary>
  );
}

export default App;
