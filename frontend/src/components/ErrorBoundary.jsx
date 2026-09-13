import React from 'react';

class ErrorBoundary extends React.Component {
      constructor(props) {
            super(props);
            this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
            return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
            console.error('LokuResume Error Boundary caught an error:', error, errorInfo);
      }

      handleReset = () => {
            this.setState({ hasError: false, error: null });
            if (this.props.onReset) {
                  this.props.onReset();
            }
      };

      render() {
            if (this.state.hasError) {
                  if (this.props.fallback) {
                        return this.props.fallback;
                  }

                  return (
                        <div style={{
                              minHeight: '60vh',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '24px',
                              textAlign: 'center'
                        }}>
                              <div style={{
                                    maxWidth: '480px',
                                    background: 'var(--card-bg, #ffffff)',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    borderRadius: '16px',
                                    padding: '32px 24px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
                              }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary, #1e293b)' }}>
                                          Something went wrong
                                    </h2>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginBottom: '20px', lineHeight: 1.5 }}>
                                          An unexpected issue occurred while rendering this section. Don&apos;t worry, your data is safe.
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                          <button
                                                onClick={this.handleReset}
                                                style={{
                                                      padding: '8px 18px',
                                                      borderRadius: '8px',
                                                      background: '#f43f5e',
                                                      color: '#ffffff',
                                                      border: 'none',
                                                      fontWeight: 600,
                                                      cursor: 'pointer'
                                                }}
                                          >
                                                Try Again
                                          </button>
                                          <button
                                                onClick={() => window.location.reload()}
                                                style={{
                                                      padding: '8px 18px',
                                                      borderRadius: '8px',
                                                      background: '#f1f5f9',
                                                      color: '#334155',
                                                      border: '1px solid #cbd5e1',
                                                      fontWeight: 600,
                                                      cursor: 'pointer'
                                                }}
                                          >
                                                Reload Page
                                          </button>
                                    </div>
                              </div>
                        </div>
                  );
            }

            return this.props.children;
      }
}

export default ErrorBoundary;
