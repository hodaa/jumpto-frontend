import { Component } from 'react';
import type { ReactNode } from 'react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Renders a safe fallback when a child component throws. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary" role="alert">
          {i18n.t('error.boundary')}
        </main>
      );
    }
    return this.props.children;
  }
}
