"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Scorecard, KPI, Section } from "@/types";
import { ParsedKPI } from "@/utils/csvParser";
import { useScorecards } from "@/context/ScorecardContext";
import KPITile from "./KPITile";
import KPIForm from "./KPIForm";
import CSVImport from "./CSVImport";
import SectionManagementModal from "./SectionManagementModal";
import AssignmentManager from "./AssignmentManager";
import {
  Plus,
  Upload,
  BarChart3,
  Settings,
  ChevronDown,
  Layout,
  User,
  Download,
  Link2,
  Copy,
  Check,
  Eye,
  RefreshCcw,
  Trash2,
  Loader2,
  ExternalLink,
  FileDown,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "./PageHeader";
import Modal from "./Modal";
import KPIVisibilityModal from "./KPIVisibilityModal";
import { v4 as uuidv4 } from "uuid";

interface ScorecardViewProps {
  scorecard: Scorecard;
}

type AssigneeLinkRow = {
  email: string;
  token: string | null;
  count: number;
};

type SectionLinkRow = {
  label: string;
  token: string | null;
  key: string;
  email: string;
};

const generateId = () =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : uuidv4();

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    addKPI,
    updateKPI,
    deleteKPI,
    refreshScorecards,
    fetchScorecardById,
    updateScorecard,
    regenerateAssigneeToken,
    deleteAssigneeToken,
  } = useScorecards();
  const [showKPIForm, setShowKPIForm] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showSectionManagement, setShowSectionManagement] = useState(false);
  const [showAssignmentManager, setShowAssignmentManager] = useState(false);
  const [showMetricVisibility, setShowMetricVisibility] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | undefined>();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assigneeLinks, setAssigneeLinks] = useState<AssigneeLinkRow[]>([]);
  const [sectionLinks, setSectionLinks] = useState<SectionLinkRow[]>([]);
  const [copyState, setCopyState] = useState<string>("");
  const [rowActionLoading, setRowActionLoading] = useState<
    Record<string, boolean>
  >({});
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowManageDropdown(false);
      }
    };

    if (showManageDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showManageDropdown]);

  useEffect(() => {
    if (!showLinksModal) {
      setRowActionLoading({});
    }
  }, [showLinksModal]);

  type BackupPayload = {
    version: string;
    exportedAt: string;
    meta: {
      name: string;
      description?: string;
      scorecardId: string;
      slug?: string;
    };
    sections: Section[];
    assignees?: Record<string, string | null>;
    kpis: Array<any>;
  };

  const fetchLatestScorecard = async (): Promise<Scorecard> => {
    const response = await fetch(`/api/scorecards/${scorecard.id}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load latest scorecard");
    }
    return (await response.json()) as Scorecard;
  };

  const buildBackupPayload = async (): Promise<BackupPayload> => {
    const latest = await fetchLatestScorecard();
    const sectionNameById = new Map<string, string>();
    (latest.sections || []).forEach((section) => {
      if (section.id) {
        sectionNameById.set(section.id, section.name);
      }
    });

    const normalizeMetrics = (kpi: KPI) => {
      const metricList =
        (Array.isArray(kpi.metrics) && kpi.metrics.length
          ? kpi.metrics
          : Array.isArray(kpi.dataPoints)
          ? kpi.dataPoints
          : []) || [];
      return metricList.map((dp: any) => {
        const rest = { ...dp } as any;
        delete rest.id;
        return {
          ...rest,
          date: normalizeDateOnly(dp.date),
        };
      });
    };

    return {
      version: "3.0",
      exportedAt: new Date().toISOString(),
      meta: {
        name: latest.name,
        description: latest.description,
        scorecardId: latest.id,
        slug: (latest as any).slug ?? undefined,
      },
      sections: latest.sections || [],
      assignees: latest.assignees || {},
      kpis: latest.kpis.map((kpi) => ({
        ...kpi,
        value: kpi.value || (kpi as any).valueJson || {},
        valueJson: (kpi as any).valueJson || kpi.value || {},
        sectionName: kpi.sectionId
          ? sectionNameById.get(kpi.sectionId) ?? null
          : null,
        metrics: normalizeMetrics(kpi),
        dataPoints: normalizeMetrics(kpi),
      })),
    };
  };

  const downloadBlob = (content: BlobPart, type: string, filename: string) => {
    const dataBlob = new Blob([content], { type });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizeDateOnly = (value?: string) => {
    if (!value) return new Date().toISOString().split("T")[0];
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().split("T")[0];
    }
    return date.toISOString().split("T")[0];
  };

  const handleAddKPI = async (kpiData: Omit<KPI, "id">) => {
    await addKPI(scorecard.id, kpiData);
    setShowKPIForm(false);
  };

  const handleEditKPI = async (kpi: KPI) => {
    try {
      const response = await fetch(`/api/kpis/${kpi.id}`, { cache: "no-store" });
      if (response.ok) {
        const latestKPI = (await response.json()) as KPI;
        setEditingKPI(latestKPI);
        setShowKPIForm(true);
        return;
      }
    } catch (error) {
      console.error("Failed to fetch latest KPI:", error);
    }

    const latestScorecard = await fetchScorecardById(scorecard.id);
    const fallbackKPI =
      latestScorecard?.kpis.find((item) => item.id === kpi.id) || kpi;
    setEditingKPI(fallbackKPI);
    setShowKPIForm(true);
  };

  const handleUpdateKPI = async (kpiData: Omit<KPI, "id">) => {
    if (editingKPI) {
      await updateKPI(scorecard.id, editingKPI.id, kpiData);
      setShowKPIForm(false);
      setEditingKPI(undefined);
    }
  };

  const handleDeleteKPI = (kpiId: string) => {
    if (confirm("Are you sure you want to delete this KPI?")) {
      deleteKPI(scorecard.id, kpiId);
    }
  };

  const handleCloseForm = () => {
    setShowKPIForm(false);
    setEditingKPI(undefined);
  };

  const handleCSVImport = async (kpis: ParsedKPI[]) => {
    try {
      // Extract unique section names from KPIs
      const sectionNames = new Set<string>();
      kpis.forEach((kpi) => {
        if (kpi.sectionName) {
          sectionNames.add(kpi.sectionName);
        }
      });

      // Create sections that don't exist and build a name->id map
      const sectionNameToId = new Map<string, string>();

      // Add existing sections to the map
      const existingSections = scorecard.sections || [];
      existingSections.forEach((section) => {
        sectionNameToId.set(section.name, section.id);
      });

      // Define colors for new sections (cycle through available colors)
      const availableColors = [
        "verdigris",
        "tuscan-sun",
        "sandy-brown",
        "burnt-peach",
        "charcoal-blue",
      ];
      let colorIndex = existingSections.length % availableColors.length;

      // Prepare new sections
      const newSections: Section[] = [];
      for (const sectionName of sectionNames) {
        if (!sectionNameToId.has(sectionName)) {
          const newSectionId = generateId();
          const newSection: Section = {
            id: newSectionId,
            name: sectionName,
            color: availableColors[colorIndex],
            order: existingSections.length + newSections.length,
          };
          newSections.push(newSection);
          sectionNameToId.set(sectionName, newSectionId);
          colorIndex = (colorIndex + 1) % availableColors.length;
        }
      }

      // Batch update sections if needed
      if (newSections.length > 0) {
        const allSections = [...existingSections, ...newSections];
        await updateScorecard(scorecard.id, { sections: allSections });
        await refreshScorecards();
      }

      // Map KPIs to their sections and prepare for import
      const kpisWithSections = kpis.map((kpi) => {
        const { sectionName, ...kpiData } = kpi;
        const sectionId = sectionName
          ? sectionNameToId.get(sectionName)
          : undefined;

        return {
          ...kpiData,
          sectionId,
          sectionName,
        };
      });

      const response = await fetch("/api/kpis/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scorecardId: scorecard.id,
          kpis: kpisWithSections,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to import CSV");
      }

      await refreshScorecards();
      setShowCSVImport(false);
    } catch (error) {
      alert(
        `Failed to import CSV: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleExportBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const backup = await buildBackupPayload();
      const dataStr = JSON.stringify(backup, null, 2);
      const safeName =
        scorecard.name.replace(/[^a-z0-9]/gi, "_") || "scorecard";

      downloadBlob(
        dataStr,
        "application/json",
        `${safeName}_backup_${new Date().toISOString().split("T")[0]}.json`
      );
      setShowManageDropdown(false);
    } catch (error) {
      alert(
        `Failed to export backup: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const backup = await buildBackupPayload();
      const headers = [
        "Scorecard",
        "Scorecard ID",
        "Section",
        "KPI Name",
        "Visualization",
        "Chart Type",
        "Metric Date",
        "Metric Value",
        "Metric Color",
        "Latest Value",
        "Assignees",
        "Assignment",
        "Notes",
        "Target Value",
        "Target Color",
        "Reverse Trend",
        "Prefix",
        "Suffix",
        "Show Legend",
        "Show Grid Lines",
        "Show Data Labels",
        "Stroke Color",
        "Stroke Width",
        "Last Updated By",
      ];

      const escapeCsv = (value: unknown) => {
        if (value === null || value === undefined) return "";
        const str =
          typeof value === "string" ? value : JSON.stringify(value ?? "");
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const rows: string[] = [headers.map(escapeCsv).join(",")];
      backup.kpis.forEach((kpi: any, idx: number) => {
        const metrics =
          (Array.isArray(kpi.metrics) && kpi.metrics.length
            ? kpi.metrics
            : Array.isArray(kpi.dataPoints)
            ? kpi.dataPoints
            : []) || [];
        const baseValue = kpi.valueJson || kpi.value || {};
        const renderedValue =
          typeof baseValue === "object" ? JSON.stringify(baseValue) : baseValue;
        const assignees = [
          ...(kpi.assignees || []),
          ...(kpi.assignee ? [kpi.assignee] : []),
        ]
          .filter(Boolean)
          .join("; ");

        const buildRow = (dp: any) =>
          [
            backup.meta?.name || scorecard.name,
            backup.meta?.scorecardId || scorecard.id,
            kpi.sectionName || "",
            kpi.name || kpi.kpiName || `KPI ${idx + 1}`,
            kpi.visualizationType || "",
            kpi.chartType || "",
            normalizeDateOnly(dp?.date || kpi.date),
            dp?.value !== undefined
              ? dp.value
              : dp?.valueArray || dp?.labeledValues || "",
            dp?.color || "",
            renderedValue,
            assignees,
            kpi.assignment || "",
            kpi.notes || "",
            kpi.targetValue ?? "",
            kpi.targetColor ?? "",
            kpi.reverseTrend ? "true" : "false",
            kpi.prefix || "",
            kpi.suffix || "",
            kpi.showLegend ?? "",
            kpi.showGridLines ?? "",
            kpi.showDataLabels ?? "",
            kpi.strokeColor || "",
            kpi.strokeWidth ?? "",
            kpi.lastUpdatedBy || "",
          ]
            .map(escapeCsv)
            .join(",");

        if (metrics.length) {
          metrics.forEach((dp: any) => rows.push(buildRow(dp)));
        } else {
          rows.push(buildRow({ date: kpi.date, value: renderedValue }));
        }
      });

      const safeName =
        scorecard.name.replace(/[^a-z0-9]/gi, "_") || "scorecard";
      downloadBlob(
        rows.join("\n"),
        "text/csv",
        `${safeName}_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      setShowManageDropdown(false);
    } catch (error) {
      alert(
        `Failed to export CSV: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || restoreLoading) return;

    try {
      setRestoreLoading(true);
      const text = await file.text();
      const rawBackup = JSON.parse(text);

      const backup: BackupPayload = {
        version: rawBackup.version || rawBackup.meta?.version || "1.0",
        exportedAt: rawBackup.exportedAt || rawBackup.meta?.exportedAt || "",
        meta: {
          name: rawBackup.meta?.name || rawBackup.name || "Scorecard",
          description: rawBackup.meta?.description ?? rawBackup.description ?? "",
          scorecardId: rawBackup.meta?.scorecardId || scorecard.id,
          slug: rawBackup.meta?.slug,
        },
        sections: Array.isArray(rawBackup.sections) ? rawBackup.sections : [],
        assignees:
          rawBackup.assignees && typeof rawBackup.assignees === "object"
            ? rawBackup.assignees
            : {},
        kpis: Array.isArray(rawBackup.kpis) ? rawBackup.kpis : [],
      };

      if (!backup.kpis || backup.kpis.length === 0) {
        throw new Error("Invalid backup file: missing KPIs data");
      }

      const backupSections = Array.isArray(backup.sections)
        ? backup.sections
        : [];
      const backupSectionNameById = new Map<string, string>();
      backupSections.forEach((section: Section) => {
        if (section.id) {
          backupSectionNameById.set(section.id, section.name);
        }
      });

      const backupName = backup.meta?.name || "Scorecard";
      const backupVersion = backup.version || "1.0";

      const confirmed = confirm(
        `Restore backup "${backupName}" (v${backupVersion}) from ${
          backup.exportedAt
            ? new Date(backup.exportedAt).toLocaleDateString()
            : "unknown date"
        }?\n\n` +
          `This will replace metrics, sections, and tokens on "${scorecard.name}". New update links will be generated.`
      );

      if (!confirmed) return;

      const availableColors = [
        "verdigris",
        "tuscan-sun",
        "sandy-brown",
        "burnt-peach",
        "charcoal-blue",
      ];
      let colorIndex = 0;
      const sectionsToPersist: Section[] = [];
      const sectionIdMap = new Map<string, string>();

      const ensureSectionByName = (name?: string | null) => {
        const normalized = (name || "").trim();
        if (!normalized) return undefined;

        const existing = sectionsToPersist.find(
          (s) => s.name.toLowerCase() === normalized.toLowerCase()
        );
        if (existing) return existing.id;

        const section: Section = {
          id: generateId(),
          name: normalized,
          color: availableColors[colorIndex % availableColors.length],
          order: sectionsToPersist.length,
        };
        colorIndex++;
        sectionsToPersist.push(section);
        return section.id;
      };

      backupSections.forEach((section: Section, idx: number) => {
        const id = ensureSectionByName(section.name || `Section ${idx + 1}`);
        if (!id) return;
        sectionIdMap.set(section.id || id, id);
        const target = sectionsToPersist.find((s) => s.id === id);
        if (!target) return;
        target.color = section.color || target.color;
        target.opacity = section.opacity ?? target.opacity;
        target.order =
          typeof section.order === "number" ? section.order : target.order;
      });

      const { generateUpdateToken } = await import("@/utils/tokenUtils");

      const kpisToRestore: KPI[] = backup.kpis.map((kpi: any, idx: number) => {
        const { sectionId, sectionName, metrics, dataPoints, valueJson, ...rest } =
          kpi;

        const inferredName =
          sectionName ||
          (sectionId ? backupSectionNameById.get(sectionId) : undefined);
        const resolvedSectionId =
          (sectionId && sectionIdMap.get(sectionId)) ||
          ensureSectionByName(inferredName ?? null);

        if (sectionId && !sectionIdMap.has(sectionId) && resolvedSectionId) {
          sectionIdMap.set(sectionId, resolvedSectionId);
        }

        const metricEntries =
          (Array.isArray(metrics) && metrics.length
            ? metrics
            : Array.isArray(dataPoints) && dataPoints.length
            ? dataPoints
            : []) || [];

        const sanitizedMetrics = metricEntries.map((dp: any) => {
          const cleanDp = { ...dp } as any;
          delete cleanDp.id;
          return {
            ...cleanDp,
            date: normalizeDateOnly(
              cleanDp.date || rest.date || backup.exportedAt
            ),
          };
        });

        const baseValue = valueJson ?? rest.value ?? {};
        const assigneeList = Array.from(
          new Set(
            [
              ...(rest.assignees || []),
              ...(rest.assignee ? [rest.assignee] : []),
            ].filter(Boolean)
          )
        );
        const requiresToken =
          assigneeList.length > 0 || Boolean(rest.updateToken);

        return {
          ...(rest as KPI),
          id: rest.id || generateId(),
          name: rest.name || rest.kpiName || `KPI ${idx + 1}`,
          kpiName: rest.kpiName || rest.name || `KPI ${idx + 1}`,
          sectionId: resolvedSectionId || undefined,
          metrics: sanitizedMetrics,
          dataPoints: sanitizedMetrics,
          value: baseValue,
          assignees: assigneeList.length ? assigneeList : undefined,
          assignee: assigneeList[0],
          updateToken: requiresToken ? generateUpdateToken() : undefined,
          visible: rest.visible ?? true,
          order: rest.order ?? idx,
          date: normalizeDateOnly(rest.date || backup.exportedAt),
        };
      });

      const translateSectionEmail = (email: string) => {
        if (!email.startsWith("__section__:")) return email;
        const key = email.replace("__section__:", "");
        const mapped =
          key === "unassigned" ? "unassigned" : sectionIdMap.get(key) || key;
        return `__section__:${mapped}`;
      };

      const assigneeEmails = new Set<string>();
      Object.keys(backup.assignees || {}).forEach((email) =>
        assigneeEmails.add(translateSectionEmail(email))
      );
      kpisToRestore.forEach((kpi) => {
        (kpi.assignees || []).forEach((email) => assigneeEmails.add(email));
        if (kpi.assignee) assigneeEmails.add(kpi.assignee);
      });

      const regeneratedAssignees: Record<string, string> = {};
      assigneeEmails.forEach((email) => {
        if (email) {
          regeneratedAssignees[email] = generateUpdateToken();
        }
      });

      const normalizedSections = sectionsToPersist
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((section, idx) => ({ ...section, order: idx }));

      const payload = {
        name: backup.meta?.name || scorecard.name,
        description:
          backup.meta?.description !== undefined
            ? backup.meta.description
            : scorecard.description,
        sections: normalizedSections,
        kpis: kpisToRestore.map((kpi) => {
          const rest = { ...kpi } as any;
          delete rest.sectionName;
          return rest;
        }),
        assignees: regeneratedAssignees,
      };

      const response = await fetch(`/api/scorecards/${scorecard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to restore backup");
      }

      await refreshScorecards();
      alert(
        "Backup imported successfully! New update links have been generated."
      );
      setShowManageDropdown(false);
    } catch (error) {
      alert(
        `Failed to import backup: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setRestoreLoading(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const visibleKPIs = useMemo(
    () => scorecard.kpis.filter((kpi) => kpi.visible !== false),
    [scorecard.kpis]
  );

  // Grouping Logic with Section Support
  const groupedKPIs = useMemo(() => {
    const groups: Map<string | null, { section: Section | null; kpis: KPI[] }> =
      new Map();

    // Initialize groups for defined sections
    (scorecard.sections || []).forEach((section) => {
      groups.set(section.id, { section, kpis: [] });
    });

    // Add unassigned/general group
    groups.set(null, { section: null, kpis: [] });

    // Assign KPIs to groups
    visibleKPIs.forEach((kpi) => {
      const sectionId = kpi.sectionId || null;
      const group = groups.get(sectionId);
      if (group) {
        group.kpis.push(kpi);
      } else {
        // If section doesn't exist, put in unassigned
        const unassignedGroup = groups.get(null);
        if (unassignedGroup) unassignedGroup.kpis.push(kpi);
      }
    });

    return groups;
  }, [visibleKPIs, scorecard.sections]);

  const selectedSectionParam = searchParams?.get("section") || null;
  const sortedSections = useMemo(() => {
    const defined = (scorecard.sections || []).sort(
      (a, b) => a.order - b.order
    );
    const all = [...defined, null]; // null represents unassigned
    if (!selectedSectionParam) return all;
    if (selectedSectionParam === "unassigned") return [null];
    return all.filter((sec) => (sec ? sec.id === selectedSectionParam : false));
  }, [scorecard.sections, selectedSectionParam]);

  const buildActionKey = (type: "assignee" | "section", identifier: string) =>
    `${type}:${identifier}`;
  const setActionLoading = (key: string, value: boolean) => {
    setRowActionLoading((prev) => ({ ...prev, [key]: value }));
  };
  const isActionLoading = (key: string) => Boolean(rowActionLoading[key]);

  const copyToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const loadLinks = async () => {
    setLinksLoading(true);
    try {
      const response = await fetch(`/api/scorecards/${scorecard.id}`);
      if (!response.ok) {
        throw new Error("Failed to load scorecard data");
      }
      const latest: Scorecard = await response.json();
      const assigneeMap = latest.assignees || {};

      const emailSet = new Set<string>();
      latest.kpis.forEach((kpi) => {
        if (kpi.assignee) emailSet.add(kpi.assignee);
        (kpi.assignees || []).forEach((email) => {
          if (email) emailSet.add(email);
        });
      });

      const updatedAssigneeLinks: AssigneeLinkRow[] = Array.from(emailSet).map(
        (email) => {
          const count = latest.kpis.filter((kpi) => {
            const list = new Set([
              ...(kpi.assignees || []),
              ...(kpi.assignee ? [kpi.assignee] : []),
            ]);
            return list.has(email);
          }).length;
          return {
            email,
            count,
            token: assigneeMap[email] ?? null,
          };
        }
      );
      setAssigneeLinks(updatedAssigneeLinks);

      const orderedSections = [...(latest.sections || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const allSections: (Section | null)[] = [...orderedSections, null];
      const sectionRows: SectionLinkRow[] = allSections.map((sec) => {
        const key = sec?.id || "unassigned";
        const pseudoEmail = `__section__:${key}`;
        return {
          label: sec ? sec.name || "Untitled Section" : "Unassigned",
          token: assigneeMap[pseudoEmail] ?? null,
          key,
          email: pseudoEmail,
        };
      });
      setSectionLinks(sectionRows);
    } catch (error) {
      console.error("Failed to load links:", error);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleRegenerateLink = async (
    type: "assignee" | "section",
    identifier: string,
    email: string
  ) => {
    const key = buildActionKey(type, identifier);
    setActionLoading(key, true);
    try {
      await regenerateAssigneeToken(scorecard.id, email);
      await loadLinks();
    } catch (error) {
      console.error("Failed to regenerate link:", error);
    } finally {
      setActionLoading(key, false);
    }
  };

  const handleDeleteLink = async (
    type: "assignee" | "section",
    identifier: string,
    email: string
  ) => {
    const key = buildActionKey(type, identifier);
    setActionLoading(key, true);
    try {
      await deleteAssigneeToken(scorecard.id, email);
      if (copyState === email) {
        setCopyState("");
      }
      await loadLinks();
    } catch (error) {
      console.error("Failed to delete link:", error);
    } finally {
      setActionLoading(key, false);
    }
  };

  const getColorVariable = (colorName: string) => {
    const colorMap: Record<string, string> = {
      verdigris: "var(--color-verdigris-500)",
      "tuscan-sun": "var(--color-tuscan-sun-500)",
      "sandy-brown": "var(--color-sandy-brown-500)",
      "burnt-peach": "var(--color-burnt-peach-500)",
      "charcoal-blue": "var(--color-charcoal-blue-500)",
    };
    return colorMap[colorName] || "var(--color-industrial-500)";
  };

  return (
    <div className="min-h-screen bg-industrial-950">
      <PageHeader
        onBack={() => router.push("/")}
        icon={<BarChart3 size={18} className="text-industrial-100" />}
        label="Scorecard"
        title={scorecard.name}
        subtitle={`${visibleKPIs.length} Visible Metrics • Updated ${new Date(
          scorecard.updatedAt
        ).toLocaleDateString()}`}
        rightContent={
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowManageDropdown(!showManageDropdown)}
              className="btn btn-secondary btn-sm"
            >
              <Settings size={16} />
              Manage Scorecard
              <ChevronDown size={16} />
            </button>

            {showManageDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-industrial-900 border border-industrial-700 rounded-md shadow-lg z-10 animate-fade-in">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowManageDropdown(false);
                      router.push(`/assignments?scorecard=${scorecard.id}`);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                  >
                    <User size={14} />
                    Assignments
                  </button>
                  <button
                    onClick={() => {
                      setShowManageDropdown(false);
                      setShowLinksModal(true);
                      loadLinks();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                  >
                    <Link2 size={14} />
                    Links
                  </button>
                  <button
                    onClick={() => {
                      setShowSectionManagement(true);
                      setShowManageDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                  >
                    <Layout size={14} />
                    Sections
                  </button>
                  <button
                    onClick={() => {
                      setShowMetricVisibility(true);
                      setShowManageDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                  >
                    <Eye size={14} />
                    Metrics
                  </button>
                  <div className="border-t border-industrial-800 my-1"></div>
                  <button
                    onClick={() => {
                      setShowManageDropdown(false);
                      void handleExportBackup();
                    }}
                    disabled={backupLoading}
                    className="w-full text-left px-4 py-2 text-sm text-industrial-300 hover:bg-industrial-800 hover:text-industrial-100 flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {backupLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Backup (JSON)
                  </button>
                  <button
                    onClick={() => {
                      setShowManageDropdown(false);
                      void handleExportCsv();
                    }}
                    disabled={exportLoading}
                    className="w-full text-left px-4 py-2 text-sm text-industrial-300 hover:bg-industrial-800 hover:text-industrial-100 flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {exportLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileDown size={14} />
                    )}
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setShowManageDropdown(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={restoreLoading}
                    className="w-full text-left px-4 py-2 text-sm text-industrial-300 hover:bg-industrial-800 hover:text-industrial-100 flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {restoreLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Restore
                  </button>
                  <div className="border-t border-industrial-800 my-1"></div>
                  <button
                    onClick={() => {
                      setShowCSVImport(true);
                      setShowManageDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                  >
                    <Upload size={14} />
                    Import CSV
                  </button>
                  <button
                    onClick={() => {
                      setShowKPIForm(true);
                      setShowManageDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add KPI
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportBackup}
            />
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {scorecard.description && (
          <div className="mb-8 p-4 border border-industrial-800 bg-industrial-900/30 rounded-md">
            <p className="text-sm text-industrial-400 font-mono">
              {scorecard.description}
            </p>
          </div>
        )}

        {/* KPI Grid */}
        {visibleKPIs.length > 0 ? (
          <div className="space-y-10">
            {sortedSections.map((sectionOrNull) => {
              const sectionId = sectionOrNull?.id || null;
              const group = groupedKPIs.get(sectionId);
              if (!group || group.kpis.length === 0) return null;

              const sectionKPIs = group.kpis.sort(
                (a, b) => (a.order || 0) - (b.order || 0)
              );
              const section = group.section;
              const showHeader = sortedSections.length > 1 || section !== null;

              return (
                <div
                  key={sectionId || "unassigned"}
                  className="animate-fade-in"
                >
                  {showHeader && (
                    <div className="mb-6">
                      {section && (
                        <div className="h-24 rounded mb-4 flex items-center bg-transparent">
                          <h2
                            className="text-7xl font-extrabold font-mono uppercase tracking-wider"
                            style={{ color: getColorVariable(section.color) }}
                          >
                            {section.name}
                          </h2>
                        </div>
                      )}
                      {!section && (
                        <h2 className="text-2xl font-bold font-mono text-industrial-200 uppercase tracking-wider mb-4">
                          General
                        </h2>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sectionKPIs.map((kpi) => (
                      <KPITile
                        key={kpi.id}
                        kpi={kpi}
                        onEdit={() => handleEditKPI(kpi)}
                        onDelete={() => handleDeleteKPI(kpi.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-12 text-center animate-fade-in flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-industrial-800 bg-transparent">
            <div className="p-4 bg-industrial-900 rounded-full border border-industrial-800 mb-6">
              <BarChart3 size={32} className="text-industrial-600" />
            </div>
            <h3 className="text-lg font-medium text-industrial-200 mb-2">
              No Metrics Visible
            </h3>
            <p className="text-industrial-500 mb-8 max-w-md text-sm">
              Add metrics manually, import data, or toggle existing metrics on
              from Manage Scorecard &gt; Metrics to show them here.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCSVImport(true)}
                className="btn btn-secondary"
              >
                <Upload size={16} />
                Import Data
              </button>
              <button
                onClick={() => setShowKPIForm(true)}
                className="btn btn-primary"
              >
                <Plus size={16} />
                Add KPI
              </button>
            </div>
          </div>
        )}
      </main>

      {showKPIForm && (
        <KPIForm
          kpi={editingKPI}
          sections={scorecard.sections}
          onSave={editingKPI ? handleUpdateKPI : handleAddKPI}
          onCancel={handleCloseForm}
        />
      )}

      {showCSVImport && (
        <CSVImport
          onImport={handleCSVImport}
          onCancel={() => setShowCSVImport(false)}
          existingKPIs={scorecard.kpis}
        />
      )}

      {showSectionManagement && (
        <SectionManagementModal
          scorecard={scorecard}
          onClose={() => setShowSectionManagement(false)}
        />
      )}

      {showMetricVisibility && (
        <KPIVisibilityModal
          scorecard={scorecard}
          onClose={() => setShowMetricVisibility(false)}
        />
      )}

      {showAssignmentManager && (
        <AssignmentManager
          scorecard={scorecard}
          onClose={() => setShowAssignmentManager(false)}
        />
      )}

      {showLinksModal && (
        <LinksModal
          onClose={() => setShowLinksModal(false)}
          sectionLinks={sectionLinks}
          assigneeLinks={assigneeLinks}
          loading={linksLoading}
          copyState={copyState}
          copyToClipboard={copyToClipboard}
          setCopyState={setCopyState}
          buildActionKey={buildActionKey}
          isActionLoading={isActionLoading}
          handleRegenerateLink={handleRegenerateLink}
          handleDeleteLink={handleDeleteLink}
        />
      )}
    </div>
  );
}

function LinksModal({
  onClose,
  sectionLinks,
  assigneeLinks,
  loading,
  copyState,
  copyToClipboard,
  setCopyState,
  buildActionKey,
  isActionLoading,
  handleRegenerateLink,
  handleDeleteLink,
}: {
  onClose: () => void;
  sectionLinks: SectionLinkRow[];
  assigneeLinks: AssigneeLinkRow[];
  loading: boolean;
  copyState: string;
  copyToClipboard: (text: string) => Promise<void>;
  setCopyState: (v: string) => void;
  buildActionKey: (type: "assignee" | "section", identifier: string) => string;
  isActionLoading: (key: string) => boolean;
  handleRegenerateLink: (
    type: "assignee" | "section",
    identifier: string,
    email: string
  ) => Promise<void>;
  handleDeleteLink: (
    type: "assignee" | "section",
    identifier: string,
    email: string
  ) => Promise<void>;
}) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Share Links"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-industrial-200 mb-2">
            Section Links
          </h4>
          <div className="border border-industrial-800 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-2/6" />
                <col className="w-3/6" />
                <col className="w-1/6" />
              </colgroup>
              <thead className="bg-industrial-600/40 text-industrial-300 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-2 text-left">Section</th>
                  <th className="px-4 py-2 text-left"></th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {sectionLinks.map((link) => {
                  const sectionKey = buildActionKey("section", link.key);
                  const actionLoading = isActionLoading(sectionKey);
                  const fullLink = link.token
                    ? `${window.location.origin}/update/user/${link.token}`
                    : "";
                  return (
                    <tr key={link.key}>
                      <td className="px-4 py-2 text-industrial-100">
                        {link.label}
                      </td>
                      <td className="px-4 py-2 text-left">
                        {link.token ? (
                          <div className="flex items-center gap-2">
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={async () => {
                                await copyToClipboard(fullLink);
                                setCopyState(link.key);
                                setTimeout(() => setCopyState(""), 1500);
                              }}
                            >
                              {copyState === link.key ? (
                                <Check size={12} />
                              ) : (
                                <Copy size={12} />
                              )}{" "}
                              Copy
                            </button>
                            <a
                              className="btn btn-xs btn-ghost"
                              href={fullLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={12} />
                              Open
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-red-400">
                            Link removed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost"
                            disabled={loading || actionLoading}
                            onClick={() =>
                              handleRegenerateLink(
                                "section",
                                link.key,
                                link.email
                              )
                            }
                            title="Generate section link"
                          >
                            {actionLoading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RefreshCcw size={12} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost text-red-400 hover:text-red-300"
                            disabled={loading || actionLoading || !link.token}
                            onClick={() =>
                              handleDeleteLink("section", link.key, link.email)
                            }
                            title="Remove section link"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-industrial-200 mb-2">
            Assignee Links
          </h4>
          <div className="border border-industrial-800 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-2/6" />
                <col className="w-3/6" />
                <col className="w-1/6" />
              </colgroup>
              <thead className="bg-industrial-600/40 text-industrial-300 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-2 text-left">Assignee</th>
                  <th className="px-4 py-2 text-left"></th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-industrial-500"
                    >
                      Loading links...
                    </td>
                  </tr>
                ) : assigneeLinks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-industrial-500"
                    >
                      No assignees found.
                    </td>
                  </tr>
                ) : (
                  assigneeLinks.map((row) => {
                    const actionKey = buildActionKey("assignee", row.email);
                    const actionLoading = isActionLoading(actionKey);
                    const fullLink = row.token
                      ? `${window.location.origin}/update/user/${row.token}`
                      : "";
                    return (
                      <tr key={row.email}>
                        <td className="px-4 py-2 text-industrial-100">
                          {row.email}
                        </td>

                        <td className="px-4 py-2 text-left">
                          {row.token ? (
                            <div className="flex items-center gap-2">
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={async () => {
                                  await copyToClipboard(fullLink);
                                  setCopyState(row.email);
                                  setTimeout(() => setCopyState(""), 1500);
                                }}
                              >
                                {copyState === row.email ? (
                                  <Check size={12} />
                                ) : (
                                  <Copy size={12} />
                                )}{" "}
                                Copy
                              </button>
                              <a
                                className="btn btn-xs btn-ghost"
                                href={fullLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink size={12} />
                                Open
                              </a>
                            </div>
                          ) : (
                            <span className="text-[11px] text-red-400">
                              Link removed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost"
                              disabled={loading || actionLoading}
                              onClick={() =>
                                handleRegenerateLink(
                                  "assignee",
                                  row.email,
                                  row.email
                                )
                              }
                              title="Regenerate link"
                            >
                              {actionLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RefreshCcw size={12} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost text-red-400 hover:text-red-300"
                              disabled={loading || actionLoading || !row.token}
                              onClick={() =>
                                handleDeleteLink(
                                  "assignee",
                                  row.email,
                                  row.email
                                )
                              }
                              title="Remove link"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
