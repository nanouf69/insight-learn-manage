import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/monitoring/errorLogger';

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
    captureError({
      message: `[ErrorBoundary] ${error.message}`,
      stack: error.stack,
      component_stack: errorInfo.componentStack ?? undefined,
      source: 'react-error-boundary',
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReload = () => {
    // Rechargement « cache-bust » SANS effacer aucune donnée persistante :
    // les files de réponses/notes/pages non envoyées, la session et tout
    // stockage local sont conservés intégralement. On recharge simplement la
    // page avec un paramètre horodaté ajouté à l'URL courante (les paramètres
    // existants sont préservés) pour forcer le navigateur à recharger les
    // fichiers à jour.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_t', String(Date.now()));
      window.location.href = url.toString();
    } catch (e) {
      console.warn('Cache-bust reload failed', e);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Détecte si l'utilisateur est sur une page apprenant (cours en ligne)
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isApprenantArea =
        path.startsWith('/cours') || path.startsWith('/bienvenue') || path === '/';

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-2xl mx-auto w-full bg-card border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6 shadow-lg space-y-4">
            <div className="text-center space-y-2">
              <div className="text-5xl">⚠️</div>
              <h2 className="text-xl font-bold text-foreground">
                Oups, un problème d'affichage est survenu
              </h2>
              <p className="text-sm text-muted-foreground">
                Vos réponses déjà confirmées par le serveur sont conservées. Voici ce que vous
                pouvez faire :
              </p>
            </div>

            {isApprenantArea && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                  📋 Étapes à suivre dans l'ordre :
                </p>
                <ol className="text-sm text-blue-900 dark:text-blue-100 space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Cliquez sur « Réessayer »</strong> ci-dessous
                  </li>
                  <li>
                    Si ça ne marche pas, cliquez sur <strong>« Recharger la version à jour »</strong>{' '}
                    (vos données sur cet appareil sont conservées)
                  </li>
                  <li>
                    Toujours bloqué ? <strong>Fermez complètement votre navigateur</strong> (toutes
                    les fenêtres) puis reconnectez-vous
                  </li>
                  <li>
                    En dernier recours, contactez le support :{' '}
                    <a
                      href="mailto:contact@ftransport.fr"
                      className="font-semibold underline hover:no-underline"
                    >
                      contact@ftransport.fr
                    </a>{' '}
                    ou appelez-nous
                  </li>
                </ol>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-900 dark:text-yellow-100">
              💡 <strong>Astuce :</strong> évitez d'ouvrir vos cours dans plusieurs onglets ou sur
              plusieurs appareils en même temps — cela peut provoquer ce type d'erreur.
            </div>

            <div className="flex gap-2 justify-center flex-wrap pt-2">
              <button
                onClick={this.handleReset}
                className="px-5 py-3 min-h-[44px] text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 active:opacity-80"
              >
                ↻ Réessayer
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-3 min-h-[44px] text-sm font-semibold bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 active:opacity-80"
              >
                🔄 Recharger la page
              </button>
              <button
                onClick={this.handleHardReload}
                className="px-5 py-3 min-h-[44px] text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800"
              >
                🔄 Recharger la version à jour
              </button>
            </div>

            {isApprenantArea && (
              <div className="text-center pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Besoin d'aide ?{' '}
                  <a
                    href="mailto:contact@ftransport.fr"
                    className="text-primary font-semibold hover:underline"
                  >
                    contact@ftransport.fr
                  </a>
                </p>
              </div>
            )}

            {this.state.error && (
              <details className="text-xs text-left bg-muted p-3 rounded-lg max-h-32 overflow-auto">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  Détails techniques (à transmettre au support si besoin)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
