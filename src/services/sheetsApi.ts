import { AllGroupsData, GroupData, GroupId, LogType, Member } from '../types';
import { normalizeDateKey } from '../utils/helpers';

const PLACEHOLDER_SHEETS_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

export const DEFAULT_SHEETS_API_URL =
  'https://script.google.com/macros/s/AKfycbwB9057uy3gORpSzM5zRb9JaRxRBWXVpW8JslE1qE6f76vjiUYR_tMrv_xuvdRK4J0D/exec';

export function isValidSheetsUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  return (
    trimmed.length > 0 &&
    trimmed !== PLACEHOLDER_SHEETS_URL &&
    (trimmed.startsWith('https://') || trimmed.startsWith('http://'))
  );
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
  const response = await fetch(apiUrl.trim(), {
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
  const response = await fetch(`${apiUrl.trim()}${separator}action=getAllData`, {
    method: 'GET',
  });
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
      result[gid] = {
        members: Array.isArray(grp.members)
          ? grp.members.map((m) => ({
              id: String(m.id ?? ''),
              name: String(m.name ?? ''),
              phone: String(m.phone ?? ''),
              birthDate: m.birthDate ? normalizeDateKey(String(m.birthDate)) : '',
              address: String(m.address ?? ''),
              notes: String(m.notes ?? ''),
              visitationNotes: String(m.visitationNotes ?? ''),
            }))
          : [],
        logs: Array.isArray(grp.logs)
          ? grp.logs.map((l) => ({
              id: String(l.id ?? ''),
              memberId: String(l.memberId ?? ''),
              date: normalizeDateKey(String(l.date ?? '')),
              timestampUTC: String(l.timestampUTC ?? ''),
              type: l.type as LogType,
            }))
          : [],
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
  const response = await fetch(
    `${apiUrl.trim()}${separator}action=getGroupData&groupId=${encodeURIComponent(groupId)}`,
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
  return {
    members: Array.isArray(payload.members) ? payload.members : [],
    logs: Array.isArray(payload.logs) ? payload.logs : [],
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
