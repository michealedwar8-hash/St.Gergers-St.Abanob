import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AllGroupsData,
  FontScale,
  GroupData,
  GroupId,
  LogEntry,
  LogType,
  Member,
  SyncSaveState,
  ToastMessage,
} from '../types';
import { createInitialSeedData, LOG_TYPE_META } from '../data/seedData';
import {
  generateId,
  getTodayUTC,
  normalizeArabic,
  normalizeDateKey,
  sanitizeLog,
  sanitizeMember,
  toWesternDigits,
} from '../utils/helpers';
import {
  DEFAULT_SHEETS_API_URL,
  fetchAllDataFromSheets,
  isValidSheetsUrl,
  syncBulkImportMembers,
  syncDeleteLog,
  syncDeleteMember,
  syncToggleLog,
  syncUpsertMember,
} from '../services/sheetsApi';

const STORAGE_DATA_KEY = 'sunday_school_attendance_data_v1';
const STORAGE_DELETED_KEY = 'sunday_school_deleted_members_v1';
const STORAGE_FONT_KEY = 'sunday_school_font_scale_v1';
const STORAGE_SHEETS_URL_KEY = 'sunday_school_sheets_api_url_v1';

type DeletedMembersMap = Record<GroupId, string[]>;

const EMPTY_DELETED_MAP: DeletedMembersMap = {
  hs_boys: [],
  hs_girls: [],
  ms_boys: [],
  ms_girls: [],
};

function loadDeletedMembers(): DeletedMembersMap {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_KEY);
    if (!raw) return { ...EMPTY_DELETED_MAP };
    const parsed = JSON.parse(raw) as Partial<DeletedMembersMap>;
    return {
      hs_boys: Array.isArray(parsed.hs_boys) ? parsed.hs_boys.map(String) : [],
      hs_girls: Array.isArray(parsed.hs_girls) ? parsed.hs_girls.map(String) : [],
      ms_boys: Array.isArray(parsed.ms_boys) ? parsed.ms_boys.map(String) : [],
      ms_girls: Array.isArray(parsed.ms_girls) ? parsed.ms_girls.map(String) : [],
    };
  } catch {
    return { ...EMPTY_DELETED_MAP };
  }
}

function saveDeletedMembers(map: DeletedMembersMap) {
  try {
    localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

const FONT_SCALE_VALUES: Record<FontScale, string> = {
  normal: '0.88',
  large: '0.98',
  xlarge: '1.1',
};

interface AppContextValue {
  groupsData: AllGroupsData;
  activeGroupId: GroupId | null;
  activeDate: string;
  todayUTC: string;
  fontScale: FontScale;
  sheetsApiUrl: string;
  isSheetsConfigured: boolean;
  isSheetsOnline: boolean;
  isRefreshing: boolean;
  saveState: SyncSaveState;
  toasts: ToastMessage[];
  openGroup: (groupId: GroupId) => void;
  goHome: () => void;
  setActiveDate: (date: string) => void;
  setFontScale: (scale: FontScale) => void;
  decreaseFont: () => void;
  increaseFont: () => void;
  resetFont: () => void;
  setSheetsApiUrl: (url: string) => void;
  setIsSheetsOnline: (online: boolean) => void;
  addToast: (message: string, variant?: ToastMessage['variant']) => void;
  removeToast: (id: string) => void;
  toggleLog: (groupId: GroupId, memberId: string, date: string, type: LogType) => void;
  toggleVisitation: (groupId: GroupId, memberId: string) => void;
  addMember: (
    groupId: GroupId,
    memberInput: Omit<Member, 'id'>,
    options?: { markPresentOnDate?: string }
  ) => Member;
  updateMemberField: (
    groupId: GroupId,
    memberId: string,
    patch: Partial<Omit<Member, 'id'>>,
    debounce?: boolean
  ) => void;
  deleteMember: (groupId: GroupId, memberId: string) => void;
  deleteLog: (groupId: GroupId, logId: string) => void;
  importMembers: (groupId: GroupId, imported: Omit<Member, 'id'>[]) => number;
  restoreGroupData: (groupId: GroupId, data: GroupData) => void;
  refreshAllFromSheets: (silent?: boolean) => Promise<void>;
  seedAllGroupsToSheets: () => Promise<{ ok: boolean; totalSent: number; error?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadInitialData(): AllGroupsData {
  const seed = createInitialSeedData();
  const deleted = loadDeletedMembers();
  const groupIds: GroupId[] = ['hs_boys', 'hs_girls', 'ms_boys', 'ms_girls'];

  const filterDeleted = (gid: GroupId, data: GroupData): GroupData => {
    const delSet = new Set(deleted[gid] || []);
    if (delSet.size === 0) return data;
    return {
      members: data.members.filter((m) => !delSet.has(m.id)),
      logs: data.logs.filter((l) => !delSet.has(l.memberId)),
    };
  };

  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (!raw) {
      const cleanedSeed: AllGroupsData = { ...seed };
      for (const gid of groupIds) {
        cleanedSeed[gid] = filterDeleted(gid, seed[gid]);
      }
      return cleanedSeed;
    }
    const parsed = JSON.parse(raw) as Partial<AllGroupsData>;
    const merged: AllGroupsData = { ...seed };
    for (const gid of groupIds) {
      if (parsed && parsed[gid] && Array.isArray(parsed[gid]!.members)) {
        const cleanMembers = parsed[gid]!.members
          .map(sanitizeMember)
          .filter((m): m is Member => m !== null);
        const cleanLogs = Array.isArray(parsed[gid]!.logs)
          ? parsed[gid]!.logs
              .map(sanitizeLog)
              .filter((l): l is LogEntry => l !== null)
          : [];
        merged[gid] = filterDeleted(gid, {
          members: cleanMembers,
          logs: cleanLogs,
        });
      } else {
        merged[gid] = filterDeleted(gid, seed[gid]);
      }
    }
    return merged;
  } catch {
    return seed;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groupsData, setGroupsData] = useState<AllGroupsData>(loadInitialData);
  const [todayUTC, setTodayUTC] = useState<string>(getTodayUTC);
  const [activeGroupId, setActiveGroupId] = useState<GroupId | null>(null);
  const [activeDate, setActiveDate] = useState<string>(getTodayUTC);

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FONT_KEY) as FontScale | null;
      if (saved && (saved === 'normal' || saved === 'large' || saved === 'xlarge')) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'normal';
  });

  const [sheetsApiUrl, setSheetsApiUrlState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHEETS_URL_KEY);
      if (saved === null || saved === 'PASTE_YOUR_WEB_APP_URL_HERE') {
        return DEFAULT_SHEETS_API_URL;
      }
      return saved;
    } catch {
      return DEFAULT_SHEETS_API_URL;
    }
  });

  const [isSheetsOnline, setIsSheetsOnline] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [saveState, setSaveState] = useState<SyncSaveState>('idle');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupsDataRef = useRef<AllGroupsData>(groupsData);
  groupsDataRef.current = groupsData;
  const deletedMembersRef = useRef<DeletedMembersMap>(loadDeletedMembers());
  const writeQueueRef = useRef<Record<GroupId, Promise<unknown>>>({
    hs_boys: Promise.resolve(),
    hs_girls: Promise.resolve(),
    ms_boys: Promise.resolve(),
    ms_girls: Promise.resolve(),
  });
  const pendingWritesCountRef = useRef<number>(0);

  const enqueueGroupWrite = useCallback(
    <T,>(groupId: GroupId, task: () => Promise<T>): Promise<T> => {
      pendingWritesCountRef.current += 1;
      const runTask = async () => {
        try {
          return await task();
        } finally {
          pendingWritesCountRef.current = Math.max(0, pendingWritesCountRef.current - 1);
        }
      };
      const next = writeQueueRef.current[groupId].then(runTask, runTask);
      writeQueueRef.current[groupId] = next.catch(() => undefined);
      return next;
    },
    []
  );

  const isSheetsConfigured = isValidSheetsUrl(sheetsApiUrl);

  // Persist groupsData to localStorage immediately on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(groupsData));
    } catch {
      // storage quota fallback
    }
  }, [groupsData]);

  // Apply font scale CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-font-scale',
      FONT_SCALE_VALUES[fontScale]
    );
    try {
      localStorage.setItem(STORAGE_FONT_KEY, fontScale);
    } catch {
      // ignore
    }
  }, [fontScale]);

  // Live calendar clock rollover watcher (syncs automatically at midnight & on tab return)
  useEffect(() => {
    const syncLiveDate = () => {
      const current = getTodayUTC();
      setTodayUTC((prevToday) => {
        if (prevToday !== current) {
          setActiveDate((prevActive) => (prevActive === prevToday ? current : prevActive));
          return current;
        }
        return prevToday;
      });
    };

    const interval = setInterval(syncLiveDate, 15000);
    window.addEventListener('focus', syncLiveDate);
    document.addEventListener('visibilitychange', syncLiveDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncLiveDate);
      document.removeEventListener('visibilitychange', syncLiveDate);
    };
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastMessage['variant'] = 'success') => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markSaveDone = useCallback((state: SyncSaveState) => {
    setSaveState(state);
    if (saveResetTimerRef.current) clearTimeout(saveResetTimerRef.current);
    if (state === 'saved' || state === 'error') {
      saveResetTimerRef.current = setTimeout(() => {
        setSaveState('idle');
      }, 2800);
    }
  }, []);

  const setSheetsApiUrl = useCallback((url: string) => {
    const cleaned = url.trim();
    setSheetsApiUrlState(cleaned);
    try {
      localStorage.setItem(STORAGE_SHEETS_URL_KEY, cleaned);
    } catch {
      // ignore
    }
    if (!isValidSheetsUrl(cleaned)) {
      setIsSheetsOnline(false);
    }
  }, []);

  const refreshAllFromSheets = useCallback(
    async (silent = false) => {
      if (!isValidSheetsUrl(sheetsApiUrl)) {
        setIsSheetsOnline(false);
        if (!silent) {
          addToast('التطبيق يعمل في الوضع المحلي — أضف رابط Google Sheets للمزامنة السحابية', 'info');
        }
        return;
      }

      setIsRefreshing(true);
      try {
        const remote = await fetchAllDataFromSheets(sheetsApiUrl);
        setIsSheetsOnline(true);
        if (remote) {
          const ghostDeletions: Array<{ gid: GroupId; memberId: string }> = [];
          setGroupsData((prev) => {
            const next = { ...prev };
            const groupIds: GroupId[] = ['hs_boys', 'hs_girls', 'ms_boys', 'ms_girls'];
            for (const gid of groupIds) {
              const r = remote[gid];
              const delSet = new Set(deletedMembersRef.current[gid] || []);
              if (r && (r.members.length > 0 || r.logs.length > 0 || delSet.size > 0)) {
                const prevVisNotes = new Map<string, string>();
                for (const pm of prev[gid].members) {
                  if (pm.visitationNotes) prevVisNotes.set(pm.id, pm.visitationNotes);
                }

                // Detect any tombstone-deleted member still lingering in Sheets and queue permanent purge
                for (const rm of r.members) {
                  if (delSet.has(rm.id)) {
                    ghostDeletions.push({ gid, memberId: rm.id });
                  }
                }

                const filteredRemoteMembers = r.members
                  .filter((rm) => !delSet.has(rm.id))
                  .map((rm) => ({
                    ...rm,
                    visitationNotes:
                      rm.visitationNotes || prevVisNotes.get(rm.id) || '',
                  }));

                const filteredRemoteLogs = r.logs.filter((rl) => !delSet.has(rl.memberId));

                // If Sheets has members (or user deleted members intentionally), apply remote cleanly
                const useRemoteMembers =
                  r.members.length > 0 || delSet.size > 0
                    ? filteredRemoteMembers
                    : prev[gid].members.filter((m) => !delSet.has(m.id));

                next[gid] = {
                  members: useRemoteMembers,
                  logs: filteredRemoteLogs,
                };
              }
            }
            groupsDataRef.current = next;
            return next;
          });

          // Silently finish purging any ghost rows in Google Sheets
          for (const g of ghostDeletions) {
            void enqueueGroupWrite(g.gid, () =>
              syncDeleteMember(sheetsApiUrl, g.gid, g.memberId)
            ).catch(() => undefined);
          }
        }
        if (!silent) {
          addToast('تم تحديث البيانات من Google Sheets بنجاح', 'success');
        }
      } catch (error) {
        setIsSheetsOnline(false);
        if (!silent) {
          addToast(
            error instanceof Error
              ? `تعذر التحديث من Google Sheets: ${error.message}`
              : 'تعذر الاتصال بـ Google Sheets، يتم استخدام النسخة المحلية',
            'error'
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [sheetsApiUrl, addToast, enqueueGroupWrite]
  );

  // Automatic real-time bidirectional sync (AI Studio <-> GitHub Hosting <-> All Devices)
  // Syncs on mount, on tab focus/visibility, and every 20s while visible — never colliding with active local writes
  useEffect(() => {
    if (!isValidSheetsUrl(sheetsApiUrl)) return;

    const tryAutoSync = () => {
      if (document.visibilityState === 'hidden') return;
      if (pendingWritesCountRef.current > 0) return;
      if (Object.keys(debounceTimersRef.current).length > 0) return;
      void refreshAllFromSheets(true);
    };

    // Initial immediate sync on mount
    void refreshAllFromSheets(true);

    const pollInterval = setInterval(tryAutoSync, 20000);
    const onFocus = () => tryAutoSync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryAutoSync();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sheetsApiUrl, refreshAllFromSheets]);

  // Auto-reset activeDate back to today's actual UTC date when entering or leaving a group
  const openGroup = useCallback((groupId: GroupId) => {
    const freshUTC = getTodayUTC();
    setTodayUTC(freshUTC);
    setActiveDate(freshUTC);
    setActiveGroupId(groupId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    const freshUTC = getTodayUTC();
    setTodayUTC(freshUTC);
    setActiveDate(freshUTC);
    setActiveGroupId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    setFontScaleState(scale);
  }, []);

  const decreaseFont = useCallback(() => {
    setFontScaleState((prev) =>
      prev === 'xlarge' ? 'large' : 'normal'
    );
  }, []);

  const increaseFont = useCallback(() => {
    setFontScaleState((prev) =>
      prev === 'normal' ? 'large' : 'xlarge'
    );
  }, []);

  const resetFont = useCallback(() => {
    setFontScaleState('normal');
  }, []);

  // Optimistic toggleLog with background Google Sheets sync and automatic revert on error
  const toggleLog = useCallback(
    (groupId: GroupId, memberId: string, date: string, type: LogType) => {
      const targetDate = normalizeDateKey(date);
      const currentGroup = groupsDataRef.current[groupId];
      const member = currentGroup.members.find((m) => m.id === memberId);
      const memberName = member?.name || 'المخدوم';
      const existing = currentGroup.logs.find(
        (l) =>
          l.memberId === memberId &&
          normalizeDateKey(l.date) === targetDate &&
          l.type === type
      );

      const previousLogs = currentGroup.logs;
      const checked = !existing;
      const timestampUTC = new Date().toISOString();
      const entryId = existing ? existing.id : generateId('log');

      const newEntry: LogEntry = {
        id: entryId,
        memberId,
        date: targetDate,
        timestampUTC,
        type,
      };

      // Synchronously update ref + state so rapid clicks never race
      const updatedLogs = checked
        ? [newEntry, ...previousLogs]
        : previousLogs.filter(
            (l) =>
              !(
                l.memberId === memberId &&
                normalizeDateKey(l.date) === targetDate &&
                l.type === type
              )
          );
      groupsDataRef.current = {
        ...groupsDataRef.current,
        [groupId]: { ...currentGroup, logs: updatedLogs },
      };

      setGroupsData((prev) => {
        const g = prev[groupId];
        const nextLogs = checked
          ? [newEntry, ...g.logs]
          : g.logs.filter(
              (l) =>
                !(
                  l.memberId === memberId &&
                  normalizeDateKey(l.date) === targetDate &&
                  l.type === type
                )
            );
        return {
          ...prev,
          [groupId]: { ...g, logs: nextLogs },
        };
      });

      const label = LOG_TYPE_META[type].label;
      if (type === 'attendance') {
        addToast(
          checked
            ? `تم تسجيل حضور ${memberName} بتاريخ ${targetDate} بنجاح`
            : `تم إلغاء تسجيل حضور ${memberName} ليوم ${targetDate}`,
          checked ? 'success' : 'info'
        );
      } else {
        addToast(
          checked
            ? `تم تسجيل "${label}" للمخدوم ${memberName} بتاريخ ${targetDate}`
            : `تم إلغاء "${label}" للمخدوم ${memberName} ليوم ${targetDate}`,
          checked ? 'success' : 'info'
        );
      }

      if (isValidSheetsUrl(sheetsApiUrl)) {
        setSaveState('saving');
        void enqueueGroupWrite(groupId, () =>
          syncToggleLog(sheetsApiUrl, {
            groupId,
            memberId,
            date: targetDate,
            type,
            checked,
            timestampUTC,
            id: entryId,
          })
        )
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            // Revert only this specific toggle entry on API error (never clobber other logs)
            setGroupsData((prev) => {
              const g = prev[groupId];
              const revertedLogs = checked
                ? g.logs.filter((l) => l.id !== entryId)
                : existing
                ? [existing, ...g.logs]
                : g.logs;
              const nextAll = { ...prev, [groupId]: { ...g, logs: revertedLogs } };
              groupsDataRef.current = nextAll;
              return nextAll;
            });
            markSaveDone('error');
            addToast('فشل الحفظ في Google Sheets — تم التراجع عن التغيير', 'error');
          });
      }
    },
    [sheetsApiUrl, addToast, markSaveDone, enqueueGroupWrite]
  );

  // Toggle "تم الافتقاد" (visited) status for a member's current absence cycle, synced to Google Sheets
  const toggleVisitation = useCallback(
    (groupId: GroupId, memberId: string) => {
      const currentGroup = groupsDataRef.current[groupId];
      const member = currentGroup.members.find((m) => m.id === memberId);
      const memberName = member?.name || 'المخدوم';
      const previousLogs = currentGroup.logs;

      // Find latest attendance log for this member
      let latestAttDate = '';
      let latestAttTs = '';
      for (const l of previousLogs) {
        if (l.memberId === memberId && l.type === 'attendance') {
          const d = normalizeDateKey(l.date);
          if (d > latestAttDate || (d === latestAttDate && l.timestampUTC > latestAttTs)) {
            latestAttDate = d;
            latestAttTs = l.timestampUTC;
          }
        }
      }

      // Find any active visitation logs recorded AFTER the latest attendance
      const activeVisitLogs = previousLogs.filter((l) => {
        if (l.memberId !== memberId || l.type !== 'visitation') return false;
        if (!latestAttDate) return true;
        const vd = normalizeDateKey(l.date);
        if (vd > latestAttDate) return true;
        if (vd < latestAttDate) return false;
        return l.timestampUTC > latestAttTs;
      });

      const isCurrentlyVisited = activeVisitLogs.length > 0;

      if (isCurrentlyVisited) {
        const removeIds = new Set(activeVisitLogs.map((l) => l.id));
        const nextLogs = previousLogs.filter((l) => !removeIds.has(l.id));
        groupsDataRef.current = {
          ...groupsDataRef.current,
          [groupId]: { ...currentGroup, logs: nextLogs },
        };
        setGroupsData((prev) => ({
          ...prev,
          [groupId]: {
            ...prev[groupId],
            logs: prev[groupId].logs.filter((l) => !removeIds.has(l.id)),
          },
        }));
        addToast(`تم إلغاء علامة افتقاد ${memberName}`, 'info');

        if (isValidSheetsUrl(sheetsApiUrl)) {
          setSaveState('saving');
          void enqueueGroupWrite(groupId, () =>
            Promise.all(
              activeVisitLogs.map((l) => syncDeleteLog(sheetsApiUrl, groupId, l.id))
            )
          )
            .then(() => {
              setIsSheetsOnline(true);
              markSaveDone('saved');
            })
            .catch(() => {
              setGroupsData((prev) => {
                const nextAll = {
                  ...prev,
                  [groupId]: {
                    ...prev[groupId],
                    logs: [...activeVisitLogs, ...prev[groupId].logs],
                  },
                };
                groupsDataRef.current = nextAll;
                return nextAll;
              });
              markSaveDone('error');
              addToast('فشل تحديث حالة الافتقاد في Google Sheets', 'error');
            });
        }
      } else {
        const visitDate = getTodayUTC();
        const timestampUTC = new Date().toISOString();
        const entryId = generateId('visit');
        const newEntry: LogEntry = {
          id: entryId,
          memberId,
          date: visitDate,
          timestampUTC,
          type: 'visitation',
        };

        groupsDataRef.current = {
          ...groupsDataRef.current,
          [groupId]: { ...currentGroup, logs: [newEntry, ...previousLogs] },
        };
        setGroupsData((prev) => ({
          ...prev,
          [groupId]: {
            ...prev[groupId],
            logs: [newEntry, ...prev[groupId].logs],
          },
        }));
        addToast(`تم تسجيل افتقاد ${memberName} بنجاح ✓`, 'success');

        if (isValidSheetsUrl(sheetsApiUrl)) {
          setSaveState('saving');
          void enqueueGroupWrite(groupId, () =>
            syncToggleLog(sheetsApiUrl, {
              groupId,
              memberId,
              date: visitDate,
              type: 'visitation',
              checked: true,
              timestampUTC,
              id: entryId,
            })
          )
            .then(() => {
              setIsSheetsOnline(true);
              markSaveDone('saved');
            })
            .catch(() => {
              setGroupsData((prev) => {
                const nextAll = {
                  ...prev,
                  [groupId]: {
                    ...prev[groupId],
                    logs: prev[groupId].logs.filter((l) => l.id !== entryId),
                  },
                };
                groupsDataRef.current = nextAll;
                return nextAll;
              });
              markSaveDone('error');
              addToast('فشل حفظ الافتقاد في Google Sheets — تم التراجع', 'error');
            });
        }
      }
    },
    [sheetsApiUrl, addToast, markSaveDone, enqueueGroupWrite]
  );

  const addMember = useCallback(
    (
      groupId: GroupId,
      memberInput: Omit<Member, 'id'>,
      options?: { markPresentOnDate?: string }
    ): Member => {
      const cleanPhone = toWesternDigits(memberInput.phone || '').trim();
      const cleanBirthDate = memberInput.birthDate?.trim()
        ? normalizeDateKey(memberInput.birthDate)
        : '';

      const newMember: Member = {
        id: generateId(groupId),
        name: memberInput.name.trim(),
        phone: cleanPhone,
        birthDate: cleanBirthDate,
        address: (memberInput.address || '').trim(),
        notes: (memberInput.notes || '').trim(),
        visitationNotes: (memberInput.visitationNotes || '').trim(),
      };

      const markDate = options?.markPresentOnDate
        ? normalizeDateKey(options.markPresentOnDate)
        : '';
      const initialAttendanceLog: LogEntry | null = markDate
        ? {
            id: generateId('log'),
            memberId: newMember.id,
            date: markDate,
            timestampUTC: new Date().toISOString(),
            type: 'attendance',
          }
        : null;

      // Synchronously update ref FIRST so immediate checkbox clicks, edits, and counts see the new member right away
      const currentGrp = groupsDataRef.current[groupId];
      const nextGroupState: GroupData = {
        members: [newMember, ...currentGrp.members],
        logs: initialAttendanceLog
          ? [initialAttendanceLog, ...currentGrp.logs]
          : currentGrp.logs,
      };
      groupsDataRef.current = {
        ...groupsDataRef.current,
        [groupId]: nextGroupState,
      };

      setGroupsData((prev) => ({
        ...prev,
        [groupId]: {
          members: [newMember, ...prev[groupId].members],
          logs: initialAttendanceLog
            ? [initialAttendanceLog, ...prev[groupId].logs]
            : prev[groupId].logs,
        },
      }));

      addToast(
        initialAttendanceLog
          ? `تم إضافة "${newMember.name}" وتسجيل حضوره بتاريخ ${markDate} بنجاح`
          : `تم إضافة المخدوم "${newMember.name}" بنجاح`,
        'success'
      );

      if (isValidSheetsUrl(sheetsApiUrl)) {
        setSaveState('saving');
        void enqueueGroupWrite(groupId, async () => {
          await syncUpsertMember(sheetsApiUrl, groupId, newMember);
          if (initialAttendanceLog) {
            await syncToggleLog(sheetsApiUrl, {
              groupId,
              memberId: newMember.id,
              date: initialAttendanceLog.date,
              type: 'attendance',
              checked: true,
              timestampUTC: initialAttendanceLog.timestampUTC,
              id: initialAttendanceLog.id,
            });
          }
        })
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            markSaveDone('error');
            addToast(
              `تم حفظ "${newMember.name}" محلياً، وتعذر المزامنة الفورية مع Google Sheets — اضغط تحديث للمحاولة`,
              'warning'
            );
          });
      }

      return newMember;
    },
    [sheetsApiUrl, addToast, markSaveDone, enqueueGroupWrite]
  );

  const updateMemberField = useCallback(
    (
      groupId: GroupId,
      memberId: string,
      patch: Partial<Omit<Member, 'id'>>,
      debounce = true
    ) => {
      const prevMembers = groupsDataRef.current[groupId].members;
      const existingMember = prevMembers.find((m) => m.id === memberId);
      if (!existingMember) return;

      const cleanPatch: Partial<Omit<Member, 'id'>> = { ...patch };
      if (typeof cleanPatch.birthDate === 'string' && cleanPatch.birthDate.trim()) {
        cleanPatch.birthDate = normalizeDateKey(cleanPatch.birthDate);
      }

      const updatedMember: Member = { ...existingMember, ...cleanPatch };

      // Synchronously update ref so immediate (non-debounced) Sheets sync never reads stale data
      const nextGroupMembers = prevMembers.map((m) =>
        m.id === memberId ? updatedMember : m
      );
      groupsDataRef.current = {
        ...groupsDataRef.current,
        [groupId]: {
          ...groupsDataRef.current[groupId],
          members: nextGroupMembers,
        },
      };

      // Immediate live update across all 6 dashboards
      setGroupsData((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          members: prev[groupId].members.map((m) =>
            m.id === memberId ? updatedMember : m
          ),
        },
      }));

      if (patch.birthDate !== undefined) {
        addToast(
          updatedMember.birthDate
            ? `تم حفظ تاريخ ميلاد ${updatedMember.name} (${updatedMember.birthDate})`
            : `تم مسح تاريخ ميلاد ${updatedMember.name}`,
          'success'
        );
      }

      if (!isValidSheetsUrl(sheetsApiUrl)) return;

      const timerKey = `${groupId}_${memberId}`;
      if (debounceTimersRef.current[timerKey]) {
        clearTimeout(debounceTimersRef.current[timerKey]);
      }

      const executeSync = (memberOverride?: Member) => {
        // Never sync an edit for a member who has since been permanently deleted
        if ((deletedMembersRef.current[groupId] || []).includes(memberId)) return;
        const latestMember =
          memberOverride ||
          groupsDataRef.current[groupId].members.find((m) => m.id === memberId);
        if (!latestMember) return;
        setSaveState('saving');
        void enqueueGroupWrite(groupId, () =>
          syncUpsertMember(sheetsApiUrl, groupId, latestMember)
        )
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            markSaveDone('error');
            addToast('تعذر حفظ التعديل في Google Sheets', 'error');
          });
      };

      if (debounce) {
        setSaveState('saving');
        debounceTimersRef.current[timerKey] = setTimeout(() => executeSync(), 600);
      } else {
        executeSync(updatedMember);
      }
    },
    [sheetsApiUrl, addToast, markSaveDone, enqueueGroupWrite]
  );

  const deleteMember = useCallback(
    (groupId: GroupId, memberId: string) => {
      // 1. Cancel any pending debounced field edit so it can NEVER resurrect the deleted member in Sheets
      const timerKey = `${groupId}_${memberId}`;
      if (debounceTimersRef.current[timerKey]) {
        clearTimeout(debounceTimersRef.current[timerKey]);
        delete debounceTimersRef.current[timerKey];
      }

      const prevGroup = groupsDataRef.current[groupId];
      const member = prevGroup.members.find((m) => m.id === memberId);

      // 2. Record permanent tombstone so this member can NEVER come back on refresh or re-seed
      const existingDeleted = deletedMembersRef.current[groupId] || [];
      if (!existingDeleted.includes(memberId)) {
        const nextDeletedMap: DeletedMembersMap = {
          ...deletedMembersRef.current,
          [groupId]: [...existingDeleted, memberId],
        };
        deletedMembersRef.current = nextDeletedMap;
        saveDeletedMembers(nextDeletedMap);
      }

      // 3. Synchronously remove member and ALL their logs from ref & React state immediately
      const nextGroup: GroupData = {
        members: prevGroup.members.filter((m) => m.id !== memberId),
        logs: prevGroup.logs.filter((l) => l.memberId !== memberId),
      };
      groupsDataRef.current = {
        ...groupsDataRef.current,
        [groupId]: nextGroup,
      };

      setGroupsData((prev) => ({
        ...prev,
        [groupId]: {
          members: prev[groupId].members.filter((m) => m.id !== memberId),
          logs: prev[groupId].logs.filter((l) => l.memberId !== memberId),
        },
      }));

      addToast(`تم حذف "${member?.name || 'المخدوم'}" نهائياً من السجل وقاعدة البيانات`, 'info');

      // 4. Permanently purge from Google Sheets via serialized write queue (with 1 automatic retry)
      if (isValidSheetsUrl(sheetsApiUrl)) {
        setSaveState('saving');
        void enqueueGroupWrite(groupId, async () => {
          try {
            await syncDeleteMember(sheetsApiUrl, groupId, memberId);
          } catch {
            // Automatic retry once on transient Apps Script glitch
            await syncDeleteMember(sheetsApiUrl, groupId, memberId);
          }
        })
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            markSaveDone('error');
            addToast(
              'تم الحذف نهائياً من الجهاز وسيُستكمل مسحه من Google Sheets تلقائياً عند استقرار الاتصال',
              'warning'
            );
          });
      }
    },
    [sheetsApiUrl, addToast, markSaveDone, enqueueGroupWrite]
  );

  const deleteLog = useCallback(
    (groupId: GroupId, logId: string) => {
      const prevLogs = groupsDataRef.current[groupId].logs;

      setGroupsData((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          logs: prev[groupId].logs.filter((l) => l.id !== logId),
        },
      }));

      addToast('تم حذف السجل وإعادة تحديث جميع اللوحات', 'info');

      if (isValidSheetsUrl(sheetsApiUrl)) {
        setSaveState('saving');
        void syncDeleteLog(sheetsApiUrl, groupId, logId)
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            setGroupsData((prev) => ({
              ...prev,
              [groupId]: { ...prev[groupId], logs: prevLogs },
            }));
            markSaveDone('error');
            addToast('فشل حذف السجل من Google Sheets — تم التراجع', 'error');
          });
      }
    },
    [sheetsApiUrl, addToast, markSaveDone]
  );

  const importMembers = useCallback(
    (groupId: GroupId, imported: Omit<Member, 'id'>[]): number => {
      const currentMembers = groupsDataRef.current[groupId].members;
      const existingNames = new Set(currentMembers.map((m) => normalizeArabic(m.name)));
      const newOnes: Member[] = [];

      for (const row of imported) {
        const cleanName = row.name.trim();
        if (!cleanName) continue;
        const norm = normalizeArabic(cleanName);
        if (existingNames.has(norm)) continue;
        existingNames.add(norm);
        newOnes.push({
          id: generateId(groupId),
          name: cleanName,
          phone: row.phone.trim(),
          birthDate: row.birthDate.trim(),
          address: row.address.trim(),
          notes: row.notes.trim(),
        });
      }

      if (newOnes.length === 0) {
        addToast('جميع الأسماء في الملف موجودة بالفعل في السجل', 'info');
        return 0;
      }

      setGroupsData((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          members: [...prev[groupId].members, ...newOnes],
        },
      }));

      addToast(`تم استيراد ${newOnes.length} مخدوم جديد بنجاح`, 'success');

      if (isValidSheetsUrl(sheetsApiUrl)) {
        setSaveState('saving');
        void syncBulkImportMembers(sheetsApiUrl, groupId, newOnes)
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            markSaveDone('error');
            addToast('تم الاستيراد محلياً لكن تعذر الرفع إلى Google Sheets', 'warning');
          });
      }

      return newOnes.length;
    },
    [sheetsApiUrl, addToast, markSaveDone]
  );

  const restoreGroupData = useCallback(
    (groupId: GroupId, data: GroupData) => {
      const cleanMembers = Array.isArray(data.members)
        ? data.members
            .map(sanitizeMember)
            .filter((m): m is Member => m !== null)
        : groupsDataRef.current[groupId].members;
      const cleanLogs = Array.isArray(data.logs)
        ? data.logs
            .map(sanitizeLog)
            .filter((l): l is LogEntry => l !== null)
        : groupsDataRef.current[groupId].logs;

      if (cleanMembers.length === 0 && data.members?.length > 0) {
        addToast('ملف النسخة الاحتياطية لا يحتوي على سجلات صالحة', 'error');
        return;
      }

      groupsDataRef.current = {
        ...groupsDataRef.current,
        [groupId]: {
          members: cleanMembers,
          logs: cleanLogs,
        },
      };

      setGroupsData((prev) => ({
        ...prev,
        [groupId]: {
          members: cleanMembers,
          logs: cleanLogs,
        },
      }));
      addToast('تم استعادة النسخة الاحتياطية بنجاح', 'success');

      if (isValidSheetsUrl(sheetsApiUrl) && cleanMembers.length > 0) {
        setSaveState('saving');
        void syncBulkImportMembers(sheetsApiUrl, groupId, cleanMembers)
          .then(() => {
            setIsSheetsOnline(true);
            markSaveDone('saved');
          })
          .catch(() => {
            markSaveDone('error');
          });
      }
    },
    [sheetsApiUrl, addToast, markSaveDone]
  );

  const seedAllGroupsToSheets = useCallback(async () => {
    if (!isValidSheetsUrl(sheetsApiUrl)) {
      return {
        ok: false,
        totalSent: 0,
        error: 'يرجى حفظ رابط Google Apps Script صحيح أولاً',
      };
    }

    const seed = createInitialSeedData();
    const groupIds: GroupId[] = ['hs_boys', 'hs_girls', 'ms_boys', 'ms_girls'];
    let totalSent = 0;

    try {
      setSaveState('saving');
      for (const gid of groupIds) {
        // Combine extracted seed members with any locally added ones, excluding permanently deleted members
        const delSet = new Set(deletedMembersRef.current[gid] || []);
        const localMembers = groupsDataRef.current[gid].members;
        const seen = new Set<string>();
        const combined: Member[] = [];

        for (const m of [...seed[gid].members, ...localMembers]) {
          if (delSet.has(m.id)) continue;
          const key = normalizeArabic(m.name);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          combined.push(m);
        }

        await syncBulkImportMembers(sheetsApiUrl, gid, combined);
        totalSent += combined.length;
      }
      setIsSheetsOnline(true);
      markSaveDone('saved');
      addToast(`تم رفع ${totalSent} اسم من الملفات الأربعة إلى Google Sheets بنجاح`, 'success');
      return { ok: true, totalSent };
    } catch (error) {
      markSaveDone('error');
      const msg =
        error instanceof Error ? error.message : 'فشل رفع البيانات إلى Google Sheets';
      addToast(`تعذر الرفع: ${msg}`, 'error');
      return { ok: false, totalSent, error: msg };
    }
  }, [sheetsApiUrl, addToast, markSaveDone]);

  return (
    <AppContext.Provider
      value={{
        groupsData,
        activeGroupId,
        activeDate,
        todayUTC,
        fontScale,
        sheetsApiUrl,
        isSheetsConfigured,
        isSheetsOnline,
        isRefreshing,
        saveState,
        toasts,
        openGroup,
        goHome,
        setActiveDate,
        setFontScale,
        decreaseFont,
        increaseFont,
        resetFont,
        setSheetsApiUrl,
        setIsSheetsOnline,
        addToast,
        removeToast,
        toggleLog,
        toggleVisitation,
        addMember,
        updateMemberField,
        deleteMember,
        deleteLog,
        importMembers,
        restoreGroupData,
        refreshAllFromSheets,
        seedAllGroupsToSheets,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
