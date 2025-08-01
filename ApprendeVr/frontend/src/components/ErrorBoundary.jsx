import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: 20 }}>
            ⚠️ Error en la aplicación
          </h2>
          <p style={{ marginBottom: 20, textAlign: 'center' }}>
            Ha ocurrido un error inesperado. Por favor, recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#547a54',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            Recargar Página
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: 20, maxWidth: '80%', overflow: 'auto' }}>
              <summary style={{ cursor: 'pointer', color: '#90caf9' }}>
                Detalles del error (solo desarrollo)
              </summary>
              <pre style={{ 
                background: '#333', 
                padding: 10, 
                borderRadius: 4, 
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 200
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 