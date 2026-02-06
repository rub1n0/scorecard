import { toBlob } from 'html-to-image';

const waitForNextFrame = () =>
    new Promise<void>((resolve) => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => resolve());
        } else {
            setTimeout(() => resolve(), 0);
        }
    });

const setApexAnimations = (chartIds: string[], enabled: boolean) => {
    if (!chartIds.length) return;
    const apex = (window as unknown as { ApexCharts?: { exec?: (...args: unknown[]) => unknown } }).ApexCharts;
    if (!apex?.exec) return;
    chartIds.forEach((chartId) => {
        try {
            apex.exec?.(
                chartId,
                'updateOptions',
                { chart: { animations: { enabled } } },
                false,
                false,
                false
            );
        } catch {
            // ignore update errors during export
        }
    });
};

const normalizeDataUrl = (dataUrl: string): string => {
    const trimmed = dataUrl.trim();
    if (trimmed.startsWith('<svg')) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
    }
    if (trimmed.startsWith('data:image/svg+xml') && !trimmed.includes(';base64,')) {
        const parts = trimmed.split(',');
        if (parts.length > 1) {
            return `${parts[0]},${encodeURIComponent(parts.slice(1).join(','))}`;
        }
    }
    return trimmed;
};

const preloadDataUrl = (dataUrl: string) =>
    new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataUrl;
    });

const loadImage = (dataUrl: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataUrl;
    });

const captureApexCharts = async (
    node: HTMLElement,
    chartIds: string[]
): Promise<Map<string, { dataUrl: string; width: number; height: number }>> => {
    const results = new Map<string, { dataUrl: string; width: number; height: number }>();
    if (!chartIds.length) return results;
    const apex = (window as unknown as { ApexCharts?: { exec?: (...args: unknown[]) => Promise<unknown> } }).ApexCharts;
    if (!apex?.exec) return results;

    for (const chartId of chartIds) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (await apex.exec(chartId, 'dataURI')) as any;
            const rawDataUrl = data?.imgURI || null;
            if (!rawDataUrl) continue;
            const dataUrl = normalizeDataUrl(rawDataUrl);
            await preloadDataUrl(dataUrl);
            const target = node.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);
            const rect = target?.getBoundingClientRect();
            results.set(chartId, {
                dataUrl,
                width: rect?.width || 0,
                height: rect?.height || 0,
            });
        } catch {
            // ignore per-chart failures
        }
    }

    return results;
};

const replaceApexChartsWithImages = (
    clone: HTMLElement,
    chartImages: Map<string, { dataUrl: string; width: number; height: number }>,
    chartIds: string[]
) => {
    if (!chartIds.length) return;
    const successful = new Set(chartImages.keys());
    const targets = clone.querySelectorAll<HTMLElement>('[data-chart-id]');
    targets.forEach((target) => {
        const chartId = target.getAttribute('data-chart-id') || '';
        if (!chartIds.includes(chartId)) return;
        if (!successful.has(chartId)) return;
        const info = chartImages.get(chartId);
        if (!info) return;
        target.innerHTML = '';
        if (info.width) target.style.width = `${info.width}px`;
        if (info.height) target.style.height = `${info.height}px`;
        const img = document.createElement('img');
        img.src = info.dataUrl;
        img.setAttribute('data-export-chart-image', 'true');
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        target.appendChild(img);
    });
};

const sanitizeImages = (clone: HTMLElement) => {
    const placeholder =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Z3lQAAAAASUVORK5CYII=';
    clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (img.getAttribute('data-export-chart-image') === 'true') return;
        const src = img.getAttribute('src') || '';
        if (src.startsWith('data:image/svg+xml')) {
            img.src = placeholder;
            return;
        }
        if (!src.startsWith('data:')) {
            img.src = placeholder;
        }
    });
};

const buildCompositeBlob = async (
    node: HTMLElement,
    clone: HTMLElement,
    chartImages: Map<string, { dataUrl: string; width: number; height: number }>,
    chartImageIds: string[],
    toBlobOptions: NonNullable<Parameters<typeof toBlob>[1]>
): Promise<Blob | null> => {
    if (!chartImageIds.length || chartImages.size === 0) return null;
    const nodeRect = node.getBoundingClientRect();
    if (!nodeRect.width || !nodeRect.height) return null;

    const placements = chartImageIds
        .map((chartId) => {
            const target = node.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);
            if (!target) return null;
            const rect = target.getBoundingClientRect();
            if (!rect.width || !rect.height) return null;
            return {
                chartId,
                x: rect.left - nodeRect.left,
                y: rect.top - nodeRect.top,
                width: rect.width,
                height: rect.height,
            };
        })
        .filter(Boolean) as Array<{ chartId: string; x: number; y: number; width: number; height: number }>;

    if (!placements.length) return null;

    const baseClone = clone.cloneNode(true) as HTMLElement;
    placements.forEach(({ chartId }) => {
        const target = baseClone.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);
        if (!target) return;
        target.innerHTML = '';
        target.style.background = 'transparent';
    });
    baseClone.querySelectorAll<HTMLImageElement>('img[data-export-chart-image="true"]').forEach((img) => {
        img.remove();
    });

    const baseBlob = await toBlob(baseClone, toBlobOptions);
    if (!baseBlob) return null;
    const baseUrl = URL.createObjectURL(baseBlob);
    const baseImg = await loadImage(baseUrl);
    URL.revokeObjectURL(baseUrl);

    const scale = nodeRect.width ? baseImg.width / nodeRect.width : 1;
    const canvas = document.createElement('canvas');
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(baseImg, 0, 0);

    for (const placement of placements) {
        const info = chartImages.get(placement.chartId);
        if (!info) continue;
        const chartImg = await loadImage(info.dataUrl);
        ctx.drawImage(
            chartImg,
            placement.x * scale,
            placement.y * scale,
            placement.width * scale,
            placement.height * scale
        );
    }

    return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), 'image/png')
    );
};

const applyComputedStyles = (original: HTMLElement, clone: HTMLElement) => {
    clone.removeAttribute('style');
    const computed = window.getComputedStyle(original);
    for (let i = 0; i < computed.length; i += 1) {
        const prop = computed[i];
        const value = computed.getPropertyValue(prop);
        if (value) {
            clone.style.setProperty(prop, value, computed.getPropertyPriority(prop));
        }
    }

    const backgroundColor = computed.getPropertyValue('background-color');
    const backgroundImage = computed.getPropertyValue('background-image');
    if (backgroundColor && backgroundImage === 'none') {
        clone.style.setProperty('background', backgroundColor);
    }

    if (clone instanceof SVGElement) {
        const fill = computed.getPropertyValue('fill');
        const stroke = computed.getPropertyValue('stroke');
        if (fill && fill !== 'none') {
            clone.setAttribute('fill', fill);
        }
        if (stroke && stroke !== 'none') {
            clone.setAttribute('stroke', stroke);
        }
    }
};

const sanitizeAttributes = (original: HTMLElement, clone: HTMLElement) => {
    const computed = window.getComputedStyle(original);
    Array.from(clone.attributes).forEach((attr) => {
        if (!attr.value.includes('oklch(')) {
            return;
        }

        if (attr.name === 'style') {
            const colorProps = [
                'color',
                'background-color',
                'border-color',
                'border-top-color',
                'border-right-color',
                'border-bottom-color',
                'border-left-color',
                'outline-color',
                'text-decoration-color',
                'caret-color',
            ];
            colorProps.forEach((propName) => {
                const computedValue = computed.getPropertyValue(propName);
                if (computedValue) {
                    clone.style.setProperty(propName, computedValue);
                }
            });
            return;
        }

        if (attr.name === 'fill' || attr.name === 'stroke' || attr.name === 'stop-color') {
            const propName = attr.name === 'stop-color' ? 'stop-color' : attr.name;
            const computedValue = computed.getPropertyValue(propName);
            if (computedValue) {
                clone.style.setProperty(propName, computedValue);
            }
        }

        clone.removeAttribute(attr.name);
    });
};

const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
    if (images.length === 0) {
        return;
    }
    await Promise.all(
        images.map((img) => {
            if (img.complete && img.naturalWidth > 0) {
                return Promise.resolve();
            }
            if (typeof img.decode === 'function') {
                return img.decode().catch(() => undefined);
            }
            return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
            });
        })
    );
};

const inlineSvgCharts = (root: HTMLElement) => {
    const svgs = Array.from(root.querySelectorAll<SVGSVGElement>('.apexcharts-canvas svg'));
    if (svgs.length === 0) {
        return;
    }

    svgs.forEach((svg) => {
        const bounds = svg.getBoundingClientRect();
        const viewBox = svg.viewBox?.baseVal;
        const width =
            bounds.width ||
            Number(svg.getAttribute('width')) ||
            (viewBox?.width ? viewBox.width : 0);
        const height =
            bounds.height ||
            Number(svg.getAttribute('height')) ||
            (viewBox?.height ? viewBox.height : 0);
        const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

        if (!clonedSvg.getAttribute('xmlns')) {
            clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        if (width) {
            clonedSvg.setAttribute('width', String(width));
        }
        if (height) {
            clonedSvg.setAttribute('height', String(height));
        }

        const svgString = new XMLSerializer().serializeToString(clonedSvg);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = '';
        img.width = Math.max(1, Math.round(width));
        img.height = Math.max(1, Math.round(height));
        img.style.width = width ? `${width}px` : '100%';
        img.style.height = height ? `${height}px` : '100%';
        img.style.display = 'block';
        img.style.pointerEvents = 'none';
        svg.replaceWith(img);
    });
};

export const downloadNodeAsPng = async (
    node: HTMLElement,
    filename: string,
    options: { transparent?: boolean; chartIds?: string[]; chartImageIds?: string[] } = {}
) => {
    const chartIds = options.chartIds ?? [];
    const chartImageIds = options.chartImageIds ?? [];
    document.body?.classList.add('exporting');
    setApexAnimations(chartIds, false);

    await waitForNextFrame();
    await waitForNextFrame();

    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    let container: HTMLDivElement | null = null;
    try {
        const chartImages = await captureApexCharts(node, chartImageIds);
        const clone = node.cloneNode(true) as HTMLElement;
        clone.classList.remove('overflow-hidden');
        clone.style.overflow = 'visible';
        clone.style.overflowX = 'visible';
        clone.style.overflowY = 'visible';
        clone.querySelectorAll<HTMLElement>('.overflow-hidden').forEach((element) => {
            element.style.overflow = 'visible';
            element.style.overflowX = 'visible';
            element.style.overflowY = 'visible';
        });
        clone.querySelectorAll<HTMLElement>('.kpi-chart-display').forEach((element) => {
            element.style.overflow = 'visible';
            element.style.overflowX = 'visible';
            element.style.overflowY = 'visible';
        });
        if (options.transparent) {
            clone.style.backgroundColor = 'transparent';
        }
        clone.querySelectorAll('link[rel="stylesheet"]').forEach((sheet) => {
            sheet.remove();
        });
        clone.querySelectorAll('style').forEach((styleTag) => {
            if (styleTag.closest('svg')) return;
            styleTag.remove();
        });
        clone.querySelectorAll('foreignObject').forEach((node) => {
            node.remove();
        });

        replaceApexChartsWithImages(clone, chartImages, chartImageIds);
        sanitizeImages(clone);

        const originalElements = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))];
        const clonedElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
        const length = Math.min(originalElements.length, clonedElements.length);

        for (let i = 0; i < length; i += 1) {
            applyComputedStyles(originalElements[i], clonedElements[i]);
            sanitizeAttributes(originalElements[i], clonedElements[i]);
        }

        // Re-apply chart images after computed styles to avoid unintended swaps from DOM diffing
        replaceApexChartsWithImages(clone, chartImages, chartImageIds);
        sanitizeImages(clone);
        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.appendChild(clone);
        document.body.appendChild(container);
        inlineSvgCharts(clone);
        await waitForImages(clone);

        const toBlobOptions = {
            backgroundColor: options.transparent ? undefined : '#18181b',
            cacheBust: true,
            pixelRatio: 2,
            style: {
                margin: '0',
            },
            imagePlaceholder:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Z3lQAAAAASUVORK5CYII=',
            skipFonts: true,
            filter: (node: HTMLElement) => {
                if (node.tagName === 'FOREIGNOBJECT') return false;
                return true;
            },
        } satisfies NonNullable<Parameters<typeof toBlob>[1]>;

        let blob: Blob | null = null;
        try {
            blob = await toBlob(clone, toBlobOptions);
        } catch (error) {
            if (error instanceof Event && (error.target as HTMLElement | null)?.tagName === 'IMG') {
                const target = error.target as HTMLImageElement;
                const chartWrapper = target.closest('[data-chart-id]');
                const chartId = chartWrapper?.getAttribute('data-chart-id') || 'unknown';
                console.error('PNG export image load failed', {
                    chartId,
                    src: target.getAttribute('src'),
                    currentSrc: (target as HTMLImageElement).currentSrc,
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                });
                blob = await buildCompositeBlob(node, clone, chartImages, chartImageIds, toBlobOptions);
                if (!blob) {
                    clone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
                        img.src = toBlobOptions.imagePlaceholder as string;
                    });
                    blob = await toBlob(clone, toBlobOptions);
                }
            } else {
                throw error;
            }
        }

        if (!blob) {
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } finally {
        setApexAnimations(chartIds, true);
        document.body?.classList.remove('exporting');
        if (container) {
            container.remove();
        }
    }
};
