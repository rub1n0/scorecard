'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendBadgeProps {
    trend: number;
    isPositive: boolean;
    isGood: boolean;
}

export default function TrendBadge({ trend, isPositive, isGood }: TrendBadgeProps) {
    const formatted = Math.abs(trend).toLocaleString(undefined, { maximumFractionDigits: 1 });
    const colorClasses = isGood
        ? 'text-emerald-700 '
        : 'text-red-700';

    return (
        <div className={`flex items-center gap-3 py-3 rounded-xl text-4xl font-mono font-bold whitespace-nowrap shadow ${colorClasses}`}>
            {isPositive ? <TrendingUp size={72} /> : <TrendingDown size={72} />}
            <span>{formatted}</span>
        </div>
    );
}
