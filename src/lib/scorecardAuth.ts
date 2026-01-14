import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/mysql';
import { kpis, scorecardAssigneeTokens } from '../../db/schema';
import { KPI_UPDATE_TOKEN_HEADER, SCORECARD_ROLE_HEADER } from '@/utils/scorecardAuthHeaders';
import { ScorecardRole } from '@/types';

type DbClient = typeof db;

const normalizeRole = (value: string | null): ScorecardRole | null => {
    if (!value) return null;
    const candidate = value.trim().toLowerCase();
    if (candidate === 'edit' || candidate === 'update') {
        return candidate;
    }
    return null;
};

export const getScorecardRole = (req: Request): ScorecardRole | null => {
    return normalizeRole(req.headers.get(SCORECARD_ROLE_HEADER)) ?? 'update';
};

export const canEditScorecard = (role: ScorecardRole | null) => role === 'edit';
export const canUpdateScorecard = (role: ScorecardRole | null) => role === 'edit' || role === 'update';
export const canViewLinks = (role: ScorecardRole | null) => canUpdateScorecard(role);

export const getKpiUpdateToken = (req: Request) => {
    return req.headers.get(KPI_UPDATE_TOKEN_HEADER)?.trim() || null;
};

export const canUseScorecardUpdateToken = async (scorecardId: string, token: string | null, tx: DbClient = db) => {
    if (!token) return false;
    const [row] = await tx
        .select({ token: scorecardAssigneeTokens.token })
        .from(scorecardAssigneeTokens)
        .where(and(eq(scorecardAssigneeTokens.scorecardId, scorecardId), eq(scorecardAssigneeTokens.token, token)))
        .limit(1);
    return Boolean(row?.token);
};

export const canUpdateKpiWithToken = async (kpiId: string, token: string | null, tx: DbClient = db) => {
    if (!token) return false;
    const [row] = await tx
        .select({ updateToken: kpis.updateToken, scorecardId: kpis.scorecardId })
        .from(kpis)
        .where(eq(kpis.id, kpiId))
        .limit(1);
    if (!row) return false;
    if (row.updateToken && row.updateToken === token) return true;
    return canUseScorecardUpdateToken(row.scorecardId, token, tx);
};
