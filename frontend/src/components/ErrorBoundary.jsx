// client/src/components/ErrorBoundary.jsx
import { Component } from "react";
import { useTranslation } from "react-i18next";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={() =>
            this.setState({ hasError: false, error: null, errorInfo: null })
          }
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, errorInfo, onReset }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface rounded-2xl p-8 text-center space-y-6 border border-border">
        <div className="text-6xl">🚨</div>

        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {t ? t("error.boundary.title") : "Something went wrong"}
          </h1>
          <p className="text-text-secondary">
            {t
              ? t("error.boundary.description")
              : "An unexpected error occurred. Please try refreshing the page."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onReset}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            {t ? t("error.boundary.tryAgain") : "Try Again"}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-secondary text-text-primary font-medium rounded-lg hover:bg-border transition-colors"
          >
            {t ? t("error.boundary.refresh") : "Refresh Page"}
          </button>
        </div>

        {import.meta.env.DEV && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
              {t ? t("error.boundary.showDetails") : "Show Error Details"}
            </summary>
            <div className="mt-3 p-4 bg-secondary rounded-lg border border-border">
              <div className="text-xs space-y-2">
                <div>
                  <strong className="text-danger">Error:</strong>
                  <pre className="whitespace-pre-wrap text-text-secondary mt-1">
                    {error && error.toString()}
                  </pre>
                </div>
                {errorInfo && (
                  <div>
                    <strong className="text-danger">Stack Trace:</strong>
                    <pre className="whitespace-pre-wrap text-text-secondary mt-1 text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </details>
        )}

        <p className="text-xs text-text-secondary">
          {t
            ? t("error.boundary.contact")
            : "If this problem persists, please contact support."}
        </p>
      </div>
    </div>
  );
};

export default ErrorBoundary;
