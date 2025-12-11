export type VisualizationType = 'chart' | 'number' | 'text' | 'sankey';

export type ChartType =
    | 'line'
    | 'area'
    | 'bar'
    | 'column'
    | 'pie'
    | 'donut'
    | 'radar'
    | 'radialBar'
    | 'scatter'
    | 'heatmap';

// Labeled value for multi-value chart types (bar, pie, donut, radar, radialBar)
export interface LabeledValue {
    label: string;
    value: number;
    color?: string;
}

export interface Metric {
    date: string;
    value: number | number[];
    valueArray?: number[]; // preserves raw array values for multi-value metrics
    labeledValues?: LabeledValue[]; // labeled key:value pairs for multi-value charts
    color?: string;
}

// Legacy alias while transitioning terminology
export type DataPoint = Metric;

export interface ChartSettings {
    strokeWidth?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    showLegend?: boolean;
    showGridLines?: boolean;
    showDataLabels?: boolean;
}

export interface Section {
    id: string;
    name: string;
    color: string; // Tailwind color class name (e.g., 'verdigris', 'tuscan-sun')
    opacity?: number; // Opacity value from 0 to 1, defaults to 1
    order: number; // Display order
}

export interface KPI {
    id: string;
    name: string;
    kpiName?: string; // normalized KPI name stored in the database
    subtitle?: string; // Optional subtitle displayed under the name
    assignment?: string; // Optional assignment/owner string
    value: Record<string, number | string>; // Stores key:value pairs. Single values as {"0": value}, categories as {category: value}
    date: string;
    notes?: string;
    visualizationType: VisualizationType;
    chartType?: ChartType;
    metrics?: Metric[]; // Historical metric entries for the KPI (formerly dataPoints)
    dataPoints?: Metric[]; // Legacy alias for backward compatibility
    trendValue?: number; // Percentage change for number display
    chartSettings?: ChartSettings;
    sectionId?: string; // Reference to Section.id
    order?: number; // Order within the section
    assignees?: string[]; // Email addresses of assigned users (supports multiple)
    assignee?: string; // DEPRECATED: single assignee, kept for backward compatibility
    updateToken?: string; // Unique token for secure updates
    lastUpdatedBy?: string; // Email of user who made last update
    reverseTrend?: boolean; // If true, trending down is good (green) and up is bad (red)
    prefix?: string; // Optional prefix for number display (e.g., "$", "€")
    prefixOpacity?: number; // Opacity of the prefix (0-1)
    suffix?: string; // Optional suffix for number display (e.g., "%", "ms", "GB")
    suffixOpacity?: number; // Opacity of the suffix (0-1)
    visible?: boolean; // Controls whether the metric is shown on the scorecard
    strokeWidth?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    showLegend?: boolean;
    showGridlines?: boolean;
    showDataLabels?: boolean;
}

export interface Scorecard {
    id: string;
    slug?: string;
    name: string;
    description?: string;
    kpis: KPI[];
    sections?: Section[]; // Defined sections for this scorecard
    assignees?: Record<string, string | null>; // email -> token
    createdAt: string;
    updatedAt: string;
}
