export type VisualizationType = 'chart' | 'number' | 'text';

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

export interface DataPoint {
    date: string;
    value: number;
    color?: string;
}

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
    subtitle?: string; // Optional subtitle displayed under the name
    value: number | string;
    date: string;
    notes?: string;
    visualizationType: VisualizationType;
    chartType?: ChartType;
    dataPoints?: DataPoint[];
    trendValue?: number; // Percentage change for number display
    chartSettings?: ChartSettings;
    section?: string; // Legacy field for backward compatibility
    sectionId?: string; // Reference to Section.id
    order?: number; // Order within the section
    assignee?: string; // Email address of assigned user
    updateToken?: string; // Unique token for secure updates
    lastUpdatedBy?: string; // Email of user who made last update
    reverseTrend?: boolean; // If true, trending down is good (green) and up is bad (red)
}

export interface Scorecard {
    id: string;
    name: string;
    description?: string;
    kpis: KPI[];
    sections?: Section[]; // Defined sections for this scorecard
    assignees?: Record<string, string>; // email -> token
    createdAt: string;
    updatedAt: string;
}
