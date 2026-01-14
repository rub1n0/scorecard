"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { BannerConfig, Scorecard, KPI, Section, ScorecardRole } from "@/types";
import { useScorecards } from "@/context/ScorecardContext";
import KPITile from "./KPITile";
import KPIForm from "./KPIForm";
import SectionManagementModal from "./SectionManagementModal";
import AssignmentManager from "./AssignmentManager";
import ManageBannersModal from "./ManageBannersModal";
import {
  Plus,
  BarChart3,
  Settings,
  ChevronDown,
  Layout,
  User,
  Flag,
  Link2,
  Copy,
  Check,
  Eye,
  RefreshCcw,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "./PageHeader";
import Modal from "./Modal";
import KPIVisibilityModal from "./KPIVisibilityModal";
import { v4 as uuidv4 } from "uuid";
import { fetchWithScorecardRole, getScorecardRole } from "@/utils/scorecardClient";

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
  const [role, setRole] = useState<ScorecardRole>("update");
  const canEdit = role === "edit";
  const canUpdate = role === "edit" || role === "update";
  const canViewLinks = canUpdate;
  const [showKPIForm, setShowKPIForm] = useState(false);
  const [showSectionManagement, setShowSectionManagement] = useState(false);
  const [showAssignmentManager, setShowAssignmentManager] = useState(false);
  const [showMetricVisibility, setShowMetricVisibility] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showManageBanners, setShowManageBanners] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | undefined>();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [assigneeLinks, setAssigneeLinks] = useState<AssigneeLinkRow[]>([]);
  const [sectionLinks, setSectionLinks] = useState<SectionLinkRow[]>([]);
  const [copyState, setCopyState] = useState<string>("");
  const [rowActionLoading, setRowActionLoading] = useState<
    Record<string, boolean>
  >({});

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

  useEffect(() => {
    const stored = getScorecardRole();
    if (stored) setRole(stored);
  }, []);


  const handleAddKPI = async (kpiData: Omit<KPI, "id">) => {
    if (!canEdit) return;
    await addKPI(scorecard.id, kpiData);
    setShowKPIForm(false);
  };

  const handleEditKPI = async (kpi: KPI) => {
    if (!canUpdate) return;
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
    if (!canUpdate) return;
    if (editingKPI) {
      await updateKPI(scorecard.id, editingKPI.id, kpiData);
      setShowKPIForm(false);
      setEditingKPI(undefined);
    }
  };

  const handleDeleteKPI = (kpiId: string) => {
    if (!canEdit) return;
    if (confirm("Are you sure you want to delete this KPI?")) {
      deleteKPI(scorecard.id, kpiId);
    }
  };

  const handleCloseForm = () => {
    setShowKPIForm(false);
    setEditingKPI(undefined);
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
      const response = await fetchWithScorecardRole(`/api/scorecards/${scorecard.id}`);
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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

  const handleSaveBanners = async (nextConfig: BannerConfig) => {
    if (!canEdit) return;
    await updateScorecard(scorecard.id, { bannerConfig: nextConfig });
  };

  return (
    <div className="min-h-screen bg-industrial-950">
      <PageHeader
        onBack={() => router.push("/")}
        icon={<BarChart3 size={18} className="text-industrial-100" />}
        label="Scorecard"
        title={scorecard.name}
        subtitle={`${visibleKPIs.length} Visible Metrics`}
        rightContent={
          canEdit || canViewLinks ? (
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
                    {canEdit && (
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
                    )}
                    {canViewLinks && (
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
                    )}
                    {canEdit && (
                      <>
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
                        <button
                          onClick={() => {
                            setShowManageBanners(true);
                            setShowManageDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-industrial-200 hover:bg-industrial-800 flex items-center gap-2"
                        >
                          <Flag size={14} />
                          Banners
                        </button>
                        <div className="border-t border-industrial-800 my-1"></div>
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
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null
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
                        bannerConfig={scorecard.bannerConfig}
                        onEdit={() => handleEditKPI(kpi)}
                        onDelete={() => handleDeleteKPI(kpi.id)}
                        canEdit={canEdit}
                        canUpdate={canUpdate}
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
              {canEdit
                ? "Add metrics manually, or toggle existing metrics on from Manage Scorecard > Metrics to show them here."
                : "No metrics are visible yet. Check back after updates are published."}
            </p>
            {canEdit && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowKPIForm(true)}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Add KPI
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {canUpdate && showKPIForm && (
        <KPIForm
          kpi={editingKPI}
          sections={scorecard.sections}
          onSave={editingKPI ? handleUpdateKPI : handleAddKPI}
          onCancel={handleCloseForm}
        />
      )}

      {canEdit && showSectionManagement && (
        <SectionManagementModal
          scorecard={scorecard}
          onClose={() => setShowSectionManagement(false)}
        />
      )}

      {canEdit && showMetricVisibility && (
        <KPIVisibilityModal
          scorecard={scorecard}
          onClose={() => setShowMetricVisibility(false)}
        />
      )}

      {canEdit && showManageBanners && (
        <ManageBannersModal
          bannerConfig={scorecard.bannerConfig}
          onClose={() => setShowManageBanners(false)}
          onSave={handleSaveBanners}
        />
      )}

      {canEdit && showAssignmentManager && (
        <AssignmentManager
          scorecard={scorecard}
          onClose={() => setShowAssignmentManager(false)}
        />
      )}

      {canViewLinks && showLinksModal && (
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
          canEdit={canEdit}
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
  canEdit,
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
  canEdit: boolean;
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
                        {canEdit && (
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
                                handleDeleteLink(
                                  "section",
                                  link.key,
                                  link.email
                                )
                              }
                              title="Remove section link"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
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
                          {canEdit && (
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
                                  <Loader2
                                    size={12}
                                    className="animate-spin"
                                  />
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
                          )}
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
