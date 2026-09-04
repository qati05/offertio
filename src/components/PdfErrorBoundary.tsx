"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class PdfErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error) {
    // Error already captured via getDerivedStateFromError — fallback UI shown
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">
            PDF konnte nicht geladen werden.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Nochmals versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
