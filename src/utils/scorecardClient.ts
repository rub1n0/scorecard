import { KPI_UPDATE_TOKEN_HEADER, SCORECARD_ROLE_HEADER } from '@/utils/scorecardAuthHeaders';
import { ScorecardRole } from '@/types';

const ROLE_STORAGE_KEY = 'scorecard_role';

const normalizeRole = (value: string | null): ScorecardRole | null => {
    if (!value) return null;
    const candidate = value.trim().toLowerCase();
    if (candidate === 'edit' || candidate === 'update') {
        return candidate;
    }
    return null;
};

export const getScorecardRole = (): ScorecardRole | null => {
    if (typeof window === 'undefined') return null;
    return normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY)) ?? 'update';
};

const mergeHeaders = (init: RequestInit | undefined, extra: Record<string, string | null>) => {
    const headers = new Headers(init?.headers || {});
    Object.entries(extra).forEach(([key, value]) => {
        if (value) headers.set(key, value);
    });
    return { ...init, headers };
};

export const withScorecardRole = (init?: RequestInit) => {
    const role = getScorecardRole();
    return mergeHeaders(init, { [SCORECARD_ROLE_HEADER]: role });
};

export const withKpiUpdateToken = (token: string, init?: RequestInit) => {
    return mergeHeaders(init, { [KPI_UPDATE_TOKEN_HEADER]: token });
};

export const fetchWithScorecardRole = (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, withScorecardRole(init));
};

export const setScorecardRole = (role: ScorecardRole | null) => {
    if (typeof window === 'undefined') return;
    if (role) {
        window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
        window.localStorage.removeItem(ROLE_STORAGE_KEY);
    }
};

export const applyRoleChange = (role: ScorecardRole | null) => {
    setScorecardRole(role);
    if (typeof window === 'undefined') return;
    window.location.reload();
};
