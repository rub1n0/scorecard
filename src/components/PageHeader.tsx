import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

type PageHeaderProps = {
    title: string;
    subtitle?: ReactNode;
    label?: string;
    icon?: ReactNode;
    onBack?: () => void;
    rightContent?: ReactNode;
};

export default function PageHeader({ title, subtitle, label, icon, onBack, rightContent }: PageHeaderProps) {
    return (
        <header className="border-b border-industrial-800 bg-industrial-900/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <>
                            <button
                                onClick={onBack}
                                className="btn btn-icon btn-secondary"
                                aria-label="Back"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className="h-8 w-px bg-industrial-800"></div>
                        </>
                    )}
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="p-2 bg-industrial-800 rounded-md border border-industrial-700">
                                {icon}
                            </div>
                        )}
                        <div>
                            {label && (
                                <p className="text-xs uppercase text-industrial-500">{label}</p>
                            )}
                            <h1 className="text-lg font-bold text-industrial-100 tracking-tight leading-none">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-xs text-industrial-500 font-mono uppercase tracking-wider mt-0.5">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                {rightContent && (
                    <div className="flex items-center gap-2">
                        {rightContent}
                    </div>
                )}
            </div>
        </header>
    );
}
