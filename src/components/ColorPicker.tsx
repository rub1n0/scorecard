'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    align?: 'left' | 'right';
}

const PALETTES = {
    'Palette 1': {
        'Colors': ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51']
    },
    'Palette 2': {
        'Colors': ['#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557']
    },
    'Palette 3': {
        'Colors': ['#001219', '#005F73', '#0A9396', '#94D2BD', '#E9D8A6', '#EE9B00', '#CA6702', '#BB3E03', '#AE2012', '#9B2226']
    },
    'Palette 4': {
        // Matches the trend badge reds/greens (tailwind red-700, emerald-700), brighter than our other sets
        'Colors': ['#B91C1C', '#047857']
    }
};

export default function ColorPicker({ value, onChange, align = 'left' }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPalette, setSelectedPalette] = useState<keyof typeof PALETTES>('Palette 1');

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 w-10 rounded border border-industrial-700 cursor-pointer flex items-center justify-center hover:border-industrial-500 transition-colors"
                style={{ backgroundColor: value }}
                title="Choose Color"
            >
                <ChevronDown size={16} className="text-white mix-blend-difference" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className={`absolute z-50 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} bg-industrial-900 border border-industrial-700 rounded-lg shadow-xl p-4 w-72`}>
                        {/* Palette Tabs */}
                        <div className="flex flex-wrap gap-2 mb-4 border-b border-industrial-800 pb-2">
                            {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map(palette => (
                                <button
                                    key={palette}
                                    type="button"
                                    onClick={() => setSelectedPalette(palette)}
                                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${selectedPalette === palette
                                        ? 'bg-industrial-700 text-industrial-100'
                                        : 'text-industrial-400 hover:text-industrial-200'
                                        }`}
                                >
                                    {palette}
                                </button>
                            ))}
                        </div>

                        {/* Color Swatches */}
                        <div className="space-y-3">
                            {Object.entries(PALETTES[selectedPalette]).map(([_name, colors]) => (
                                <div key={_name}>
                                    <div
                                        className="grid gap-2"
                                        style={{ gridTemplateColumns: `repeat(${Math.max(Math.min(colors.length, 5), 2)}, minmax(0, 1fr))` }}
                                    >
                                        {colors.map((color, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    onChange(color);
                                                    setIsOpen(false);
                                                }}
                                                className={`w-10 h-10 rounded cursor-pointer border-2 transition-all hover:scale-110 ${value.toLowerCase() === color.toLowerCase()
                                                    ? 'border-white ring-2 ring-industrial-500'
                                                    : 'border-industrial-800 hover:border-industrial-600'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
