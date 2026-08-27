import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('WhatPlan render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="error-boundary" role="alert"><h1>Algo salió mal</h1><p>No pudimos mostrar esta pantalla. Intentá recargarla para continuar.</p><Button type="button" onClick={() => window.location.reload()}>Recargar</Button></main>;
  }
}
