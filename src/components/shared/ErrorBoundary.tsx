import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Here you could send to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Algo salió mal</CardTitle>
              <CardDescription>
                Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details in development */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="font-mono text-xs text-muted-foreground">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} variant="default" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Intentar de nuevo
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recargar página
                </Button>
                <Button onClick={this.handleGoHome} variant="ghost" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
