'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ChartErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Chart rendering error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <AlertTriangle size={32} className="text-red-500 mb-2" />
                    <p className="text-xs text-red-400 font-mono uppercase tracking-wider">Chart Rendering Error</p>
                    <p className="text-xs text-industrial-600 mt-1">Please check your data</p>
                </div>
            );
        }

        return this.props.children;
    }
}
