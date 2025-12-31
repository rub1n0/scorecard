#!/usr/bin/env node
import 'dotenv/config';
import mysql from 'mysql2/promise';

const baseUrl = process.env.SCORECARD_BASE_URL || 'http://localhost:3000';
const targetKpiId = process.env.KPI_ID || null;
const multiTypes = new Set(['radar', 'bar', 'column', 'pie', 'donut', 'radialBar']);

const fetchJson = async (url, init) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
};

const pickMultiValueKpi = (scorecards) => {
  for (const sc of scorecards || []) {
    for (const kpi of sc.kpis || []) {
      if (multiTypes.has(kpi.chartType)) return kpi;
    }
  }
  return null;
};

const findKpi = (scorecards, kpiId) => {
  for (const sc of scorecards || []) {
    const match = (sc.kpis || []).find((kpi) => kpi.id === kpiId);
    if (match) return match;
  }
  return null;
};

const buildConnectionUri = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const db = process.env.DB_NAME || '';
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
};

const normalizeJson = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const main = async () => {
  const scorecards = await fetchJson(`${baseUrl}/api/scorecards`);
  const targetKpi = targetKpiId
    ? findKpi(scorecards, targetKpiId)
    : pickMultiValueKpi(scorecards);

  if (!targetKpi) {
    throw new Error('No multi-value KPI found for verification.');
  }

  const before = await fetchJson(`${baseUrl}/api/kpis/${targetKpi.id}`);

  const seed = Date.now().toString().slice(-4);
  const categories = [
    { label: `Segment A ${seed}`, value: 11, color: '#5094af' },
    { label: `Segment B ${seed}`, value: 22, color: '#36c9b8' },
    { label: `Segment C ${seed}`, value: 33, color: '#dea821' },
  ];

  const updatePayload = {
    value: Object.fromEntries(categories.map((c) => [c.label, c.value])),
    metrics: categories.map((c) => ({ date: c.label, value: c.value, color: c.color })),
    dataPoints: categories.map((c) => ({ date: c.label, value: c.value, color: c.color })),
    chartType: targetKpi.chartType,
    visualizationType: targetKpi.visualizationType,
    date: new Date().toISOString(),
  };

  const updateResponse = await fetchJson(`${baseUrl}/api/kpis/${targetKpi.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });

  const after = await fetchJson(`${baseUrl}/api/kpis/${targetKpi.id}`);

  const connection = await mysql.createConnection(buildConnectionUri());
  const [rows] = await connection.execute(
    'select date, value, color from metrics where kpi_id = ? order by date desc',
    [targetKpi.id]
  );
  await connection.end();

  const dbRows = Array.isArray(rows)
    ? rows.map((row) => ({
        date: row.date,
        value: normalizeJson(row.value),
        color: row.color,
      }))
    : [];

  console.log(
    JSON.stringify(
      {
        kpiId: targetKpi.id,
        chartType: targetKpi.chartType,
        apiBefore: {
          visualizationType: before.visualizationType,
          metricsSample: before.metrics?.[0] ?? null,
        },
        apiAfter: {
          visualizationType: after.visualizationType,
          value: after.value ?? null,
          labeledValues: after.metrics?.[0]?.labeledValues ?? null,
        },
        apiUpdateResponse: {
          updatedAt: updateResponse.updatedAt ?? null,
          value: updateResponse.value ?? updateResponse.valueJson ?? null,
        },
        dbRows,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
