'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentTextSize } from '@/types';

type MarkdownContentProps = {
    content: string;
    className?: string;
    size?: CommentTextSize;
};

const sizeClasses: Record<CommentTextSize, string> = {
    'extra-small': 'text-xs',
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    'extra-large': 'text-xl',
};

export default function MarkdownContent({
    content,
    className,
    size = 'small',
}: MarkdownContentProps) {
    const rootClassName = [
        'text-industrial-200 leading-relaxed break-words',
        sizeClasses[size],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={rootClassName}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: (props) => (
                        <h1 className="text-2xl font-semibold text-white mt-5 mb-2" {...props} />
                    ),
                    h2: (props) => (
                        <h2 className="text-xl font-semibold text-white mt-4 mb-2" {...props} />
                    ),
                    h3: (props) => (
                        <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />
                    ),
                    h4: (props) => (
                        <h4 className="text-base font-semibold text-white mt-3 mb-1.5" {...props} />
                    ),
                    p: (props) => <p className="mb-3 last:mb-0" {...props} />,
                    a: (props) => (
                        <a
                            className="text-sky-surge-400 hover:text-sky-surge-300 underline underline-offset-4"
                            {...props}
                        />
                    ),
                    ul: (props) => <ul className="list-disc ml-5 space-y-1.5" {...props} />,
                    ol: (props) => <ol className="list-decimal ml-5 space-y-1.5" {...props} />,
                    li: (props) => <li className="text-industrial-200" {...props} />,
                    blockquote: (props) => (
                        <blockquote
                            className="border-l-2 border-industrial-700 bg-industrial-900/40 text-industrial-300 italic pl-4 py-2 rounded-r-md my-3"
                            {...props}
                        />
                    ),
                    hr: (props) => <hr className="border-industrial-800 my-4" {...props} />,
                    table: (props) => (
                        <div className="overflow-x-auto my-3">
                            <table className="w-full text-left border-collapse border border-industrial-800" {...props} />
                        </div>
                    ),
                    thead: (props) => <thead className="bg-industrial-900/70" {...props} />,
                    tbody: (props) => <tbody {...props} />,
                    tr: (props) => <tr className="border-b border-industrial-800 last:border-0" {...props} />,
                    th: (props) => (
                        <th className="px-3 py-2 text-xs font-semibold text-industrial-100 uppercase tracking-wider" {...props} />
                    ),
                    td: (props) => <td className="px-3 py-2 text-industrial-200 align-top" {...props} />,
                    code: (props) => {
                        const isInline = (props as { inline?: boolean }).inline === true;
                        const { inline: _inline, ...rest } = props as Record<string, unknown>;
                        void _inline;
                        return isInline ? (
                            <code className="bg-industrial-900 px-1.5 py-0.5 rounded text-amber-300 text-[0.85em]" {...rest} />
                        ) : (
                            <code className="text-amber-300 text-[0.85em]" {...rest} />
                        );
                    },
                    pre: (props) => (
                        <pre className="bg-industrial-950/80 border border-industrial-800 rounded-md p-3 overflow-x-auto my-3" {...props} />
                    ),
                    strong: (props) => <strong className="font-semibold text-white" {...props} />,
                    em: (props) => <em className="text-industrial-100 italic" {...props} />,
                    img: (props) => (
                        <img className="rounded-md border border-industrial-800 my-3" {...props} />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
