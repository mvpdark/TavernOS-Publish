import { Component, type ReactNode } from "react";
import type { JSX } from "react";
import { BTN } from "./ui.js";
import { IconAlertTriangle } from "./Icons.js";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches render errors in any page component
 * and shows a friendly error message instead of a black screen.
 * The user can click "重试" to retry.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): JSX.Element {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-8">
          <div className="max-w-md text-center">
            <div className="mb-4 flex items-center justify-center">
              <span className="sr-only">错误</span>
              <IconAlertTriangle size={48} className="text-[var(--color-danger)] opacity-30" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-lg font-light text-[var(--color-text-muted)]">页面出错了</h1>
            <p className="mb-1 text-sm text-[var(--color-text-faint)]">
              {this.state.error?.message ?? "未知错误"}
            </p>
            <p className="mb-6 text-xs text-gray-600">
              刷新页面或点击下方按钮重试
            </p>
            <button
              onClick={this.handleReload}
              className={BTN.primary}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}
