/**
 * Error Boundary Component
 *
 * Catches React errors and displays a fallback UI.
 * Prevents entire app from crashing due to component errors.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-[#18181B] border border-[#27272A] rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-[#A1A1AA] mb-6">
              An unexpected error occurred. You can try refreshing the component or return to the home screen.
            </p>

            <details className="mb-6 text-left">
              <summary className="text-sm text-[#A1A1AA] cursor-pointer hover:text-white mb-2">
                Error details
              </summary>
              <pre className="text-xs bg-[#0A0A0B] border border-[#27272A] rounded p-3 overflow-auto max-h-40 text-red-400">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.resetError}
                className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-[#27272A] text-white rounded-lg hover:bg-[#3F3F46] transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
