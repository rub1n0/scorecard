#!/usr/bin/env node

const baseUrl = process.env.SCORECARD_BASE_URL || "http://localhost:3000";
const targetKpiId = process.env.KPI_ID || null;

const fetchJson = async (url, init) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
};

const pickFirstKpi = (scorecards) => {
  for (const scorecard of scorecards || []) {
    if (Array.isArray(scorecard.kpis) && scorecard.kpis.length) {
      return scorecard.kpis[0];
    }
  }
  return null;
};

const findKpi = (scorecards, kpiId) => {
  for (const scorecard of scorecards || []) {
    const match = (scorecard.kpis || []).find((kpi) => kpi.id === kpiId);
    if (match) return match;
  }
  return null;
};

const getNumericValue = (kpi) => {
  if (!kpi) return 0;
  const raw = kpi.value?.["0"] ?? Object.values(kpi.value || {})[0];
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const main = async () => {
  const scorecardsBefore = await fetchJson(`${baseUrl}/api/scorecards`);
  const initialKpi = targetKpiId
    ? findKpi(scorecardsBefore, targetKpiId)
    : pickFirstKpi(scorecardsBefore);

  if (!initialKpi) {
    throw new Error("No KPI found to verify update.");
  }

  const beforeValue = getNumericValue(initialKpi);
  const nextValue = beforeValue + 1;
  const updatePayload = {
    value: { "0": nextValue },
    trendValue: nextValue,
    notes: `verify-update-${Date.now()}`,
    date: new Date().toISOString(),
  };

  const updateResponse = await fetchJson(
    `${baseUrl}/api/kpis/${initialKpi.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    }
  );

  const scorecardsAfter = await fetchJson(`${baseUrl}/api/scorecards`);
  const updatedKpi = findKpi(scorecardsAfter, initialKpi.id);

  if (!updatedKpi) {
    throw new Error("Updated KPI not found in follow-up fetch.");
  }

  const afterValue = getNumericValue(updatedKpi);

  console.log(
    JSON.stringify(
      {
        kpiId: initialKpi.id,
        updatePortal: {
          updatedAtBefore: initialKpi.updatedAt ?? null,
          updatedAtAfter: updatedKpi.updatedAt ?? null,
        },
        editModal: {
          valueBefore: beforeValue,
          valueAfter: afterValue,
        },
        apiResponse: {
          updatedAt: updateResponse.updatedAt ?? null,
          value: updateResponse.value ?? updateResponse.valueJson ?? null,
        },
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
