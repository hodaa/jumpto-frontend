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
          <p>{i18n.t('error.boundary')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            {i18n.t('actions.reload')}
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
