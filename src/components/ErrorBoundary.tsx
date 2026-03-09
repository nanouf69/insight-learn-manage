import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erreur capturée:', error);
    console.error('[ErrorBoundary] Stack composant:', errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-semibold text-foreground">
              Une erreur est survenue
            </h2>
            <p className="text-sm text-muted-foreground">
              Cette section n'a pas pu s'afficher correctement.
            </p>
            {this.state.error && (
              <details className="text-xs text-left bg-muted p-3 rounded-lg max-h-32 overflow-auto">
                <summary className="cursor-pointer font-medium">Détails techniques</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 min-h-[44px] text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 active:opacity-80"
              >
                Réessayer
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 min-h-[44px] text-sm bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 active:opacity-80"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
