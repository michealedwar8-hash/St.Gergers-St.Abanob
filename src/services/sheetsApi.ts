import { AllGroupsData, GroupData, GroupId, LogType, Member } from '../types';
import { sanitizeLog, sanitizeMember } from '../utils/helpers';

const PLACEHOLDER_SHEETS_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';
const REQUEST_TIMEOUT_MS = 20000;

export const DEFAULT_SHEETS_API_URL =
  'https://script.google.com/macros/s/AKfycbwB9057uy3gORpSzM5zRb9JaRxRBWXVpW8JslE1qE6f76vjiUYR_tMrv_xuvdRK4J0D/exec';

const ALLOWED_SHEETS_HOSTS = new Set([
  'script.google.com',
  'script.googleusercontent.com',
]);

/**
 * Strictly validates that the API URL uses HTTPS and points only to official Google Apps Script endpoints.
 * Prevents HTTP downgrade attacks and unauthorized data exfiltration to third-party domains.
 */
export function isValidSheetsUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  if (!trimmed || trimmed === PLACEHOLDER_SHEETS_URL) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (!ALLOWED_SHEETS_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    return parsed.pathname.length > 1;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

interface ApiResponse<T = unknown> {
  ok?: boolean;
  error?: string;
  data?: T;
  groups?: Partial<AllGroupsData>;
  members?: Member[];
  logs?: GroupData['logs'];
  [key: string]: unknown;
}

async function postToSheets(
  apiUrl: string,
  payload: Record<string, unknown>
): Promise<ApiResponse> {
  if (!isValidSheetsUrl(apiUrl)) {
    return { ok: true };
  }

  // MANDATORY CORS-safe header for Google Apps Script (no application/json preflight)
  const response = await fetchWithTimeout(apiUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text) return { ok: true };

  try {
    const json = JSON.parse(text) as ApiResponse;
    if (json && json.ok === false) {
      throw new Error(json.error || 'فشل الحفظ في Google Sheets');
    }
    return json;
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { ok: true };
    }
    throw err;
  }
}

export async function fetchAllDataFromSheets(
  apiUrl: string
): Promise<Partial<AllGroupsData> | null> {
  if (!isValidSheetsUrl(apiUrl)) return null;
  const separator = apiUrl.includes('?') ? '&' : '?';
  // Cache-busting timestamp guarantees AI Studio and GitHub Pages always fetch live fresh data
  const response = await fetchWithTimeout(
    `${apiUrl.trim()}${separator}action=getAllData&_t=${Date.now()}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const json = (await response.json()) as ApiResponse;
  if (json && json.ok === false) {
    throw new Error(json.error || 'تعذر قراءة البيانات من Google Sheets');
  }
  // Support multiple common Apps Script JSON envelopes
  const source = (json.data ?? json.groups ?? json) as Partial<AllGroupsData>;
  if (!source || typeof source !== 'object') return null;

  const result: Partial<AllGroupsData> = {};
  const groupIds: GroupId[] = ['hs_boys', 'hs_girls', 'ms_boys', 'ms_girls'];
  for (const gid of groupIds) {
    const grp = source[gid];
    if (grp && (Array.isArray(grp.members) || Array.isArray(grp.logs))) {
      const safeMembers: Member[] = [];
      if (Array.isArray(grp.members)) {
        for (const rawM of grp.members) {
          const clean = sanitizeMember(rawM);
          if (clean) safeMembers.push(clean);
        }
      }
      const safeLogs: GroupData['logs'] = [];
      if (Array.isArray(grp.logs)) {
        for (const rawL of grp.logs) {
          const clean = sanitizeLog(rawL);
          if (clean) safeLogs.push(clean);
        }
      }
      result[gid] = {
        members: safeMembers,
        logs: safeLogs,
      };
    }
  }
  return result;
}

export async function fetchGroupDataFromSheets(
  apiUrl: string,
  groupId: GroupId
): Promise<GroupData | null> {
  if (!isValidSheetsUrl(apiUrl)) return null;
  const separator = apiUrl.includes('?') ? '&' : '?';
  const response = await fetchWithTimeout(
    `${apiUrl.trim()}${separator}action=getGroupData&groupId=${encodeURIComponent(groupId)}&_t=${Date.now()}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const json = (await response.json()) as ApiResponse;
  if (json && json.ok === false) {
    throw new Error(json.error || 'تعذر تحميل بيانات السجل');
  }
  const payload = (json.data ?? json) as Partial<GroupData>;
  if (!payload) return null;
  const safeMembers = Array.isArray(payload.members)
    ? payload.members.map(sanitizeMember).filter((m): m is Member => m !== null)
    : [];
  const safeLogs = Array.isArray(payload.logs)
    ? payload.logs.map(sanitizeLog).filter((l): l is GroupData['logs'][number] => l !== null)
    : [];
  return {
    members: safeMembers,
    logs: safeLogs,
  };
}

export async function testSheetsConnection(apiUrl: string): Promise<{ ok: boolean; message: string }> {
  if (!isValidSheetsUrl(apiUrl)) {
    return { ok: false, message: 'الرجاء إدخال رابط Google Apps Script Web App صحيح أولاً' };
  }
  try {
    const data = await fetchAllDataFromSheets(apiUrl);
    if (data !== null) {
      return { ok: true, message: 'تم الاتصال بـ Google Sheets بنجاح!' };
    }
    return { ok: true, message: 'تم الاتصال بالخادم بنجاح' };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `فشل الاتصال: ${error.message}`
          : 'تعذر الاتصال برابط Google Apps Script',
    };
  }
}

export async function syncToggleLog(
  apiUrl: string,
  params: {
    groupId: GroupId;
    memberId: string;
    date: string;
    type: LogType;
    checked: boolean;
    timestampUTC: string;
    id: string;
  }
) {
  return postToSheets(apiUrl, {
    action: 'toggleLog',
    ...params,
  });
}

export async function syncUpsertMember(
  apiUrl: string,
  groupId: GroupId,
  member: Member
) {
  return postToSheets(apiUrl, {
    action: 'upsertMember',
    groupId,
    member,
  });
}

export async function syncDeleteLog(
  apiUrl: string,
  groupId: GroupId,
  logId: string
) {
  return postToSheets(apiUrl, {
    action: 'deleteLog',
    groupId,
    logId,
  });
}

export async function syncDeleteMember(
  apiUrl: string,
  groupId: GroupId,
  memberId: string
) {
  return postToSheets(apiUrl, {
    action: 'deleteMember',
    groupId,
    memberId,
  });
}

export async function syncBulkImportMembers(
  apiUrl: string,
  groupId: GroupId,
  members: Member[]
) {
  return postToSheets(apiUrl, {
    action: 'bulkImportMembers',
    groupId,
    members,
  });
}
