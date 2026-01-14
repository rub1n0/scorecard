import { BannerConfig, BannerPalette, KPIBannerStatus } from '@/types';

export type BannerPaletteOption = {
    value: BannerPalette;
    label: string;
    className: string;
    swatchClassName: string;
};

export const BANNER_PALETTE_OPTIONS: BannerPaletteOption[] = [
    {
        value: 'accent',
        label: 'Accent Blue',
        className: 'border-accent-500/70 text-accent-500 bg-accent-600/10',
        swatchClassName: 'bg-accent-500',
    },
    {
        value: 'sky-surge',
        label: 'Sky Surge',
        className: 'border-sky-surge-500/60 text-sky-surge-200 bg-sky-surge-950/70',
        swatchClassName: 'bg-sky-surge-500',
    },
    {
        value: 'verdigris',
        label: 'Verdigris',
        className: 'border-verdigris-500/60 text-verdigris-200 bg-verdigris-950/70',
        swatchClassName: 'bg-verdigris-500',
    },
    {
        value: 'tuscan-sun',
        label: 'Tuscan Sun',
        className: 'border-tuscan-sun-500/60 text-tuscan-sun-200 bg-tuscan-sun-950/70',
        swatchClassName: 'bg-tuscan-sun-500',
    },
    {
        value: 'sandy-brown',
        label: 'Sandy Brown',
        className: 'border-sandy-brown-500/60 text-sandy-brown-200 bg-sandy-brown-950/70',
        swatchClassName: 'bg-sandy-brown-500',
    },
    {
        value: 'burnt-peach',
        label: 'Burnt Peach',
        className: 'border-burnt-peach-500/60 text-burnt-peach-200 bg-burnt-peach-950/70',
        swatchClassName: 'bg-burnt-peach-500',
    },
    {
        value: 'charcoal-blue',
        label: 'Charcoal Blue',
        className: 'border-charcoal-blue-500/60 text-charcoal-blue-200 bg-charcoal-blue-950/70',
        swatchClassName: 'bg-charcoal-blue-500',
    },
    {
        value: 'industrial',
        label: 'Industrial',
        className: 'border-industrial-600/70 text-industrial-200 bg-industrial-900/70',
        swatchClassName: 'bg-industrial-600',
    },
];

const paletteByValue = BANNER_PALETTE_OPTIONS.reduce(
    (acc, option) => {
        acc[option.value] = option;
        return acc;
    },
    {} as Record<BannerPalette, BannerPaletteOption>
);

export const DEFAULT_BANNER_CONFIG: BannerConfig = {
    under_construction: {
        label: 'Under Construction',
        palette: 'tuscan-sun',
    },
    coming_soon: {
        label: 'Coming Soon',
        palette: 'accent',
    },
    retired: {
        label: 'Retired',
        palette: 'industrial',
    },
};

const isBannerPalette = (value: unknown): value is BannerPalette =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(paletteByValue, value);

const normalizeLabel = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed === '' ? fallback : trimmed;
};

export const normalizeBannerConfig = (config?: BannerConfig | null): BannerConfig => {
    const normalized: BannerConfig = { ...DEFAULT_BANNER_CONFIG };

    if (!config) return normalized;

    (Object.keys(DEFAULT_BANNER_CONFIG) as KPIBannerStatus[]).forEach((status) => {
        const entry = config[status];
        if (!entry) return;
        normalized[status] = {
            label: normalizeLabel(entry.label, normalized[status].label),
            palette: isBannerPalette(entry.palette) ? entry.palette : normalized[status].palette,
        };
    });

    return normalized;
};

export const getBannerPalette = (palette: BannerPalette) =>
    paletteByValue[palette] ?? BANNER_PALETTE_OPTIONS[0];
