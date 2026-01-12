import {
    boolean,
    date,
    datetime,
    timestamp,
    double,
    index,
    int,
    json,
    mysqlTable,
    serial,
    text,
    uniqueIndex,
    primaryKey,
    varchar,
} from 'drizzle-orm/mysql-core';

// Scorecards
export const scorecards = mysqlTable(
    'scorecards',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        description: text('description'),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        nameIdx: index('idx_scorecards_name').on(table.name),
    })
);

// Sections (referenced by kpis.sectionId)
export const sections = mysqlTable(
    'sections',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        scorecardId: varchar('scorecard_id', { length: 36 }).notNull(),
        name: varchar('name', { length: 255 }),
        displayOrder: int('display_order').default(0).notNull(),
        color: varchar('color', { length: 64 }),
        opacity: double('opacity').default(1),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        scorecardIdx: index('idx_sections_scorecard').on(table.scorecardId),
    })
);

// KPIs
export const kpis = mysqlTable(
    'kpis',
    {
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
        prefixOpacity: double('prefix_opacity'),
        suffix: varchar('suffix', { length: 32 }),
        suffixOpacity: double('suffix_opacity'),
        strokeWidth: int('stroke_width'),
        strokeColor: varchar('stroke_color', { length: 64 }),
        strokeOpacity: double('stroke_opacity'),
    showLegend: boolean('show_legend').default(true).notNull(),
    showGridlines: boolean('show_gridlines').default(true).notNull(),
    showDataLabels: boolean('show_data_labels').default(false).notNull(),
    trendValue: double('trend_value'),
    latestValue: double('latest_value'),
    targetValue: json('target_value'),
    targetColor: varchar('target_color', { length: 64 }),
    sankeySettings: json('sankey_settings'),
    valueJson: json('value_json'),
    notes: text('notes'),
    commentTextSize: varchar('comment_text_size', { length: 24 }),
    chartSettings: json('chart_settings'),
    order: int('order'),
    lastUpdatedBy: varchar('last_updated_by', { length: 255 }),
        visible: boolean('visible').default(true).notNull(),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        scorecardIdx: index('idx_kpis_scorecard').on(table.scorecardId),
        sectionIdx: index('idx_kpis_section').on(table.sectionId),
        nameIdx: index('idx_kpis_name').on(table.name),
        kpiSectionUnique: uniqueIndex('uniq_kpi_section').on(table.kpiName, table.sectionId),
    })
);

// Metrics captured for each KPI (formerly datapoints)
export const metrics = mysqlTable(
    'metrics',
    {
        id: serial('id').primaryKey(),
        kpiId: varchar('kpi_id', { length: 36 }).notNull(),
        date: date('date').notNull(),
        value: json('value').notNull(),
        color: varchar('color', { length: 32 }),
    },
    (table) => ({
        kpiIdx: index('idx_metrics_kpi').on(table.kpiId),
        uniqKpiDate: uniqueIndex('uniq_metric_kpi_date').on(table.kpiId, table.date),
    })
);

// KPI values (key/value pairs from KPI.value)
export const kpiValues = mysqlTable(
    'kpi_values',
    {
        id: serial('id').primaryKey(),
        kpiId: varchar('kpi_id', { length: 36 }).notNull(),
        valueKey: varchar('value_key', { length: 255 }).notNull(),
        numericValue: double('numeric_value'),
        textValue: text('text_value'),
    },
    (table) => ({
        uniqueKpiKey: uniqueIndex('uniq_kpi_value_key').on(table.kpiId, table.valueKey),
    })
);

// Assignments
export const assignments = mysqlTable(
    'assignments',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        kpiId: varchar('kpi_id', { length: 36 }).notNull(),
        sectionId: varchar('section_id', { length: 36 }),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        kpiIdx: index('idx_assignments_kpi').on(table.kpiId),
    })
);

// Users (derived from assignee strings/emails)
export const users = mysqlTable(
    'users',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        name: varchar('name', { length: 255 }),
        email: varchar('email', { length: 255 }),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        emailIdx: index('idx_users_email').on(table.email),
    })
);

// Assignment assignees (many-to-many between assignments and users)
export const assignmentAssignees = mysqlTable(
    'assignment_assignees',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        assignmentId: varchar('assignment_id', { length: 36 }).notNull(),
        userId: varchar('user_id', { length: 36 }).notNull(),
    },
    (table) => ({
        assignmentIdx: index('idx_assignment_users_assignment').on(table.assignmentId),
        userIdx: index('idx_assignment_users_user').on(table.userId),
    })
);

// Scorecard-level assignee tokens (email -> token map)
export const scorecardAssigneeTokens = mysqlTable(
    'scorecard_assignee_tokens',
    {
        id: serial('id').primaryKey(),
        scorecardId: varchar('scorecard_id', { length: 36 }).notNull(),
        email: varchar('email', { length: 255 }).notNull(),
        token: varchar('token', { length: 255 }).notNull(),
    },
    (table) => ({
        uniq: primaryKey({ columns: [table.scorecardId, table.email] }),
    })
);
