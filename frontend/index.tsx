import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg">
            <h1 className="text-xl font-bold text-red-600 mb-2">Bir hata oluştu</h1>
            <pre className="text-sm text-gray-700 overflow-auto whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);