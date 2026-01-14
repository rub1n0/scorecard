'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BannerConfig, BannerPalette, KPIBannerStatus } from '@/types';
import Modal from './Modal';
import { BANNER_PALETTE_OPTIONS, getBannerPalette, normalizeBannerConfig } from '@/utils/bannerConfig';

interface ManageBannersModalProps {
    bannerConfig?: BannerConfig | null;
    onClose: () => void;
    onSave: (nextConfig: BannerConfig) => Promise<void> | void;
}

const bannerOrder: Array<{ status: KPIBannerStatus; title: string }> = [
    { status: 'under_construction', title: 'Under Construction' },
    { status: 'coming_soon', title: 'Coming Soon' },
    { status: 'retired', title: 'Retired' },
];

export default function ManageBannersModal({ bannerConfig, onClose, onSave }: ManageBannersModalProps) {
    const [draft, setDraft] = useState<BannerConfig>(() => normalizeBannerConfig(bannerConfig));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDraft(normalizeBannerConfig(bannerConfig));
    }, [bannerConfig]);

    const paletteOptions = useMemo(() => BANNER_PALETTE_OPTIONS, []);

    const updateBanner = (status: KPIBannerStatus, patch: Partial<{ label: string; palette: BannerPalette }>) => {
        setDraft((prev) => ({
            ...prev,
            [status]: {
                ...prev[status],
                ...patch,
            },
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await Promise.resolve(onSave(normalizeBannerConfig(draft)));
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Manage Banners"
            headerActions={
                <button
                    type="button"
                    className="btn btn-secondary h-10 bg-verdigris-600 text-industrial-950 border-verdigris-500 hover:bg-verdigris-500 hover:border-verdigris-400 disabled:opacity-60"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Banners'}
                </button>
            }
            maxWidth="max-w-3xl"
        >
            <div className="space-y-6">
                {bannerOrder.map((banner) => {
                    const current = draft[banner.status];
                    const palette = getBannerPalette(current.palette);
                    return (
                        <div key={banner.status} className="border border-industrial-800 rounded-md p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-industrial-200 uppercase tracking-wide">
                                    {banner.title}
                                </div>
                                <div
                                    className={`border-y px-4 py-2 text-center text-sm font-mono font-semibold uppercase tracking-[0.3em] ${palette.className}`}
                                >
                                    {current.label}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 items-start">
                                <div>
                                    <label className="form-label">Banner text</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={current.label}
                                        onChange={(e) => updateBanner(banner.status, { label: e.target.value })}
                                        placeholder={banner.title}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Palette</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {paletteOptions.map((option) => {
                                            const isActive = option.value === current.palette;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => updateBanner(banner.status, { palette: option.value })}
                                                    className={`h-9 w-9 rounded border-2 transition-all ${isActive
                                                        ? 'border-industrial-100 scale-[1.05]'
                                                        : 'border-industrial-700 hover:border-industrial-500'
                                                        }`}
                                                    title={option.label}
                                                >
                                                    <span className={`block h-full w-full rounded ${option.swatchClassName}`} />
                                                </button>
                                            );
                                        })}
                                        <span className="text-xs text-industrial-500">
                                            {palette.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
