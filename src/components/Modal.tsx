'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
    className?: string;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    headerActions,
    children,
    footer,
    maxWidth = 'max-w-2xl',
    className = '',
}: ModalProps) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal ${maxWidth} ${className}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-header">
                    <div>
                        <h2 className="text-xl font-bold text-industrial-100 uppercase tracking-wide">{title}</h2>
                        {subtitle && (
                            <p className="text-xs text-industrial-400 font-mono uppercase tracking-wider mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {headerActions}
                        <button
                            onClick={onClose}
                            className="btn btn-icon btn-secondary"
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                    {children}
                </div>

                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
