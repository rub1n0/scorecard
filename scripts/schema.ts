import {
    boolean,
    datetime,
    date,
    double,
    int,
    json,
    mysqlTable,
    serial,
    text,
    varchar,
    timestamp,
} from 'drizzle-orm/mysql-core';

// Scorecards
export const scorecards = mysqlTable('scorecards', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
});

// Sections
export const sections = mysqlTable('sections', {
    id: varchar('id', { length: 36 }).primaryKey(),
    scorecardId: varchar('scorecard_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }),
    displayOrder: int('display_order').default(0).notNull(),
    color: varchar('color', { length: 64 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
});

// KPIs
export const kpis = mysqlTable('kpis', {
    id: varchar('id', { length: 36 }).primaryKey(),
    scorecardId: varchar('scorecard_id', { length: 36 }).notNull(),
    sectionId: varchar('section_id', { length: 36 }),
    name: varchar('name', { length: 255 }).notNull(),
    kpiName: varchar('kpi_name', { length: 255 }).notNull(),
    subtitle: varchar('subtitle', { length: 255 }),
    assignment: varchar('assignment', { length: 255 }),
    visualizationType: varchar('visualization_type', { length: 32 }).notNull(),
    chartType: varchar('chart_type', { length: 32 }),
    reverseTrend: boolean('reverse_trend').default(false).notNull(),
    updateToken: varchar('update_token', { length: 255 }),
    date: datetime('date', { fsp: 3 }).notNull(),
    prefix: varchar('prefix', { length: 32 }),
    suffix: varchar('suffix', { length: 32 }),
    strokeWidth: int('stroke_width'),
    strokeColor: varchar('stroke_color', { length: 64 }),
    strokeOpacity: double('stroke_opacity'),
    showLegend: boolean('show_legend').default(true).notNull(),
    showGridlines: boolean('show_gridlines').default(true).notNull(),
    showDataLabels: boolean('show_data_labels').default(false).notNull(),
    trendValue: double('trend_value'),
    latestValue: double('latest_value'),
    sankeySettings: json('sankey_settings'),
    valueJson: json('value_json'),
    notes: text('notes'),
    chartSettings: json('chart_settings'),
    order: int('order'),
    lastUpdatedBy: varchar('last_updated_by', { length: 255 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
});

// Metrics (formerly datapoints)
export const metrics = mysqlTable('metrics', {
    id: serial('id').primaryKey(),
    kpiId: varchar('kpi_id', { length: 36 }).notNull(),
    date: date('date').notNull(),
    value: json('value').notNull(),
    color: varchar('color', { length: 32 }),
});

// Assignments
export const assignments = mysqlTable('assignments', {
    id: varchar('id', { length: 36 }).primaryKey(),
    kpiId: varchar('kpi_id', { length: 36 }).notNull(),
    sectionId: varchar('section_id', { length: 36 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
});

// Users
export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
});

// Assignment assignees (many-to-many)
export const assignmentAssignees = mysqlTable('assignment_assignees', {
    id: varchar('id', { length: 36 }).primaryKey(),
    assignmentId: varchar('assignment_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
});

// Scorecard-level assignee tokens (email -> token)
export const scorecardAssigneeTokens = mysqlTable('scorecard_assignee_tokens', {
    id: serial('id').primaryKey(),
    scorecardId: varchar('scorecard_id', { length: 36 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
});
