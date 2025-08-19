import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Ошибка приложения:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          fontFamily: 'Inter, system-ui, Arial, sans-serif',
          backgroundColor: '#f0f0f0'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: '#e74c3c', marginBottom: '16px' }}>
              Произошла ошибка
            </h2>
            <p style={{ color: '#2c3e50', marginBottom: '24px' }}>
              Приложение столкнулось с неожиданной ошибкой. Попробуйте обновить страницу.
            </p>
            {this.state.error && (
              <details style={{ 
                marginBottom: '24px', 
                textAlign: 'left',
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                  Подробности ошибки
                </summary>
                <code style={{ color: '#e74c3c' }}>
                  {this.state.error.message}
                </code>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#3498db',
                color: '#ffffff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
