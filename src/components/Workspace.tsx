import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Cake,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  HeartHandshake,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { GroupId, Member, TabId } from '../types';
import { GROUP_CONFIG_MAP } from '../data/seedData';
import { useApp } from '../context/AppContext';
import {
  formatArabicDateFull,
  getBirthdayInfo,
  normalizeArabic,
  normalizeDateKey,
} from '../utils/helpers';
import { FontSizeControl } from './FontSizeControl';
import { ArabicCalendarModal } from './ArabicCalendarModal';
import { MainRecordTab } from './tabs/MainRecordTab';
import { VisitationTab } from './tabs/VisitationTab';
import { BirthdaysTab } from './tabs/BirthdaysTab';
import { TodayAttendanceTab } from './tabs/TodayAttendanceTab';
import { DateLogTab } from './tabs/DateLogTab';
import { MasterDatabaseTab } from './tabs/MasterDatabaseTab';

interface WorkspaceProps {
  groupId: GroupId;
}

export const Workspace: React.FC<WorkspaceProps> = ({ groupId }) => {
  const {
    groupsData,
    activeDate,
    todayUTC,
    setActiveDate,
    goHome,
    saveState,
    isSheetsConfigured,
    isRefreshing,
    refreshAllFromSheets,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>('main');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);
  const [jumpCounter, setJumpCounter] = useState<number>(0);
  const [calendarOpen, setCalendarOpen] = useState<boolean>(false);

  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupConfig = GROUP_CONFIG_MAP[groupId];
  const { members, logs } = groupsData[groupId];

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search state if group changes
  useEffect(() => {
    setSearchQuery('');
    setDropdownOpen(false);
    setHighlightedMemberId(null);
  }, [groupId]);

  const datesWithAttendance = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      if (log.type === 'attendance') {
        set.add(normalizeDateKey(log.date));
      }
    }
    return set;
  }, [logs]);

  const activeDatePresentIds = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      if (log.type === 'attendance' && normalizeDateKey(log.date) === activeDate) {
        set.add(log.memberId);
      }
    }
    return set;
  }, [logs, activeDate]);

  const presentTodayCount = useMemo(() => {
    const ids = new Set<string>();
    for (const log of logs) {
      if (normalizeDateKey(log.date) === todayUTC && log.type === 'attendance') {
        ids.add(log.memberId);
      }
    }
    return ids.size;
  }, [logs, todayUTC]);

  const totalAllMembers = useMemo(() => {
    return (
      groupsData.hs_boys.members.length +
      groupsData.hs_girls.members.length +
      groupsData.ms_boys.members.length +
      groupsData.ms_girls.members.length
    );
  }, [groupsData]);

  const todaysBirthdayCount = useMemo(() => {
    let count = 0;
    for (const m of members) {
      const info = getBirthdayInfo(m.birthDate, todayUTC);
      if (info?.isToday) count++;
    }
    return count;
  }, [members, todayUTC]);

  // Autocomplete dropdown matches
  const dropdownMatches = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q) return [];
    return members.filter(
      (m) =>
        normalizeArabic(m.name).includes(q) ||
        m.phone.includes(searchQuery.trim()) ||
        normalizeArabic(m.notes).includes(q)
    );
  }, [members, searchQuery]);

  const handleSelectMemberFromDropdown = (member: Member) => {
    setDropdownOpen(false);
    setSearchQuery('');
    // Ensure we jump directly to the main names table so the row is guaranteed visible
    if (activeTab !== 'main') {
      setActiveTab('main');
    }
    setHighlightedMemberId(member.id);
    setJumpCounter((c) => c + 1);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMemberId(null);
    }, 4500);
  };

  const handleSelectActiveDate = (newDate: string) => {
    setActiveDate(newDate);
    let countOnDate = 0;
    const seen = new Set<string>();
    for (const log of logs) {
      if (log.type === 'attendance' && normalizeDateKey(log.date) === newDate) {
        if (!seen.has(log.memberId)) {
          seen.add(log.memberId);
          countOnDate++;
        }
      }
    }
    addToast(
      countOnDate > 0
        ? `تم عرض تاريخ ${newDate} — الحضور المسجل: ${countOnDate} مخدوم`
        : `تم التبديل لتاريخ ${newDate} — لا يوجد حضور مسجل في هذا اليوم`,
      'info'
    );
  };

  const tabs: Array<{
    id: TabId;
    label: string;
    icon: React.FC<{ className?: string }>;
    activeBg: string;
    badge?: number;
  }> = [
    {
      id: 'main',
      label: 'السجل الرئيسي',
      icon: ClipboardList,
      activeBg: 'bg-indigo-600 text-white border-indigo-700 shadow-sm',
    },
    {
      id: 'visitation',
      label: 'الافتقاد والمتابعة',
      icon: HeartHandshake,
      activeBg: 'bg-rose-600 text-white border-rose-700 shadow-sm',
    },
    {
      id: 'birthdays',
      label: 'أعياد الميلاد',
      icon: Cake,
      activeBg: 'bg-amber-500 text-white border-amber-600 shadow-sm',
      badge: todaysBirthdayCount > 0 ? todaysBirthdayCount : undefined,
    },
    {
      id: 'today',
      label: 'حضور اليوم',
      icon: CalendarCheck2,
      activeBg: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
      badge: presentTodayCount > 0 ? presentTodayCount : undefined,
    },
    {
      id: 'by_date',
      label: 'الحضور بالتاريخ',
      icon: CalendarDays,
      activeBg: 'bg-sky-600 text-white border-sky-700 shadow-sm',
    },
    {
      id: 'database',
      label: 'بيانات سجل الحضور',
      icon: Database,
      activeBg: 'bg-violet-600 text-white border-violet-700 shadow-sm',
    },
  ];

  const isTodaySelected = activeDate === todayUTC;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Compact Responsive Workspace Header */}
      <header
        className={`no-print bg-gradient-to-l ${groupConfig.gradientClass} text-white shadow-sm`}
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-amber-50 font-extrabold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4 text-indigo-700" />
              <span>القائمة الرئيسية</span>
            </button>

            {/* Dual Visual Identity: Transparent Saint + Matching Youth/Girls Cutouts */}
            <div className="flex items-end gap-1.5 shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-end justify-center shrink-0">
                <img
                  src={groupConfig.saintImage}
                  alt={groupConfig.saintAlt}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain drop-shadow-[0_3px_6px_rgba(15,23,42,0.45)]"
                />
              </div>
              <div className="h-12 w-16 sm:h-14 sm:w-20 flex items-end justify-center shrink-0">
                <img
                  src={groupConfig.groupImage}
                  alt={groupConfig.groupAlt}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain drop-shadow-[0_3px_6px_rgba(15,23,42,0.45)]"
                />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black leading-tight truncate">
                {groupConfig.workspaceTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] sm:text-xs font-bold text-white/90">
                <span className="tabular-nums">مخدومو الأسرة: {members.length}</span>
                <span>•</span>
                <span className="tabular-nums">الإجمالي الكلي: {totalAllMembers}</span>
                <span>•</span>
                <span className="tabular-nums">حضور اليوم: {presentTodayCount}</span>
                {isSheetsConfigured && saveState === 'saving' && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-amber-200">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جاري الحفظ...
                    </span>
                  </>
                )}
                {isSheetsConfigured && saveState === 'saved' && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      تم الحفظ ✓
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FontSizeControl compact />
            <button
              type="button"
              onClick={() => void refreshAllFromSheets(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-extrabold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>
      </header>

      {/* Control Bar: Autocomplete Name Search + Active Date Picker + 6 Tabs */}
      <div className="no-print bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Live Search Bar with Autocomplete Dropdown */}
          <div ref={searchWrapperRef} className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim()) setDropdownOpen(true);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(e.target.value.trim().length > 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDropdownOpen(false);
                } else if (e.key === 'Enter' && dropdownMatches.length > 0) {
                  e.preventDefault();
                  handleSelectMemberFromDropdown(dropdownMatches[0]);
                }
              }}
              placeholder="ابحث بالاسم لاختيار مخدوم والانتقال إليه..."
              aria-label="بحث بالاسم"
              className="w-full pr-10 pl-9 py-2 rounded-xl border-2 border-slate-200 focus:border-indigo-500 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDropdownOpen(false);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                aria-label="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Autocomplete Dropdown Results */}
            {dropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute right-0 left-0 top-full mt-1.5 z-50 bg-white rounded-xl border-2 border-indigo-200 shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                {dropdownMatches.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs font-bold text-slate-500">
                    لا توجد أسماء مطابقة لـ «{searchQuery}»
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 bg-indigo-50 text-[11px] font-extrabold text-indigo-800 flex items-center justify-between sticky top-0">
                      <span>النتائج المطابقة ({dropdownMatches.length})</span>
                      <span>اضغط على الاسم للانتقال إليه</span>
                    </div>
                    {dropdownMatches.map((m) => {
                      const isPresentNow = activeDatePresentIds.has(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMemberFromDropdown(m)}
                          className="w-full text-right px-3.5 py-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-900 truncate">
                              {m.name}
                            </p>
                            {m.phone && (
                              <p className="text-xs font-mono-num font-semibold text-slate-500">
                                {m.phone}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold shrink-0 border ${
                              isPresentNow
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isPresentNow && <UserCheck className="w-3 h-3" />}
                            {isPresentNow ? 'حاضر' : 'الانتقال'}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Compact Live Active Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                isTodaySelected
                  ? 'bg-indigo-50 border-indigo-300 hover:border-indigo-500 text-indigo-950'
                  : 'bg-amber-50 border-amber-400 hover:border-amber-600 text-amber-950'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isTodaySelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-[11px] font-extrabold opacity-80 leading-tight">
                  التاريخ النشط (اضغط للتغيير)
                </div>
                <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                  <span>{formatArabicDateFull(activeDate)}</span>
                  <span className="font-mono-num text-[11px] px-1.5 py-0.5 rounded bg-white/85 border border-slate-200">
                    {activeDate}
                  </span>
                </div>
              </div>
            </button>

            {!isTodaySelected && (
              <button
                type="button"
                onClick={() => handleSelectActiveDate(todayUTC)}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs cursor-pointer shadow-xs whitespace-nowrap"
              >
                العودة لليوم
              </button>
            )}
          </div>
        </div>

        {/* Compact 6-Tab Navigation */}
        <nav
          aria-label="لوحات السجل"
          className="max-w-[1440px] mx-auto px-3 sm:px-5 pb-2.5 pt-0.5 overflow-x-auto"
        >
          <div className="flex items-center gap-1.5 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-xs sm:text-sm border transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? tab.activeBg
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono-num font-black ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Active Dashboard Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 py-4">
        {activeTab === 'main' && (
          <MainRecordTab
            groupId={groupId}
            searchQuery={searchQuery}
            highlightedMemberId={highlightedMemberId}
            jumpCounter={jumpCounter}
            onMemberAdded={handleSelectMemberFromDropdown}
          />
        )}
        {activeTab === 'visitation' && (
          <VisitationTab groupId={groupId} searchQuery={searchQuery} />
        )}
        {activeTab === 'birthdays' && (
          <BirthdaysTab
            groupId={groupId}
            searchQuery={searchQuery}
            onJumpToTab={setActiveTab}
          />
        )}
        {activeTab === 'today' && (
          <TodayAttendanceTab
            groupId={groupId}
            searchQuery={searchQuery}
            onJumpToTab={setActiveTab}
          />
        )}
        {activeTab === 'by_date' && (
          <DateLogTab groupId={groupId} searchQuery={searchQuery} />
        )}
        {activeTab === 'database' && (
          <MasterDatabaseTab groupId={groupId} searchQuery={searchQuery} />
        )}
      </main>

      <ArabicCalendarModal
        isOpen={calendarOpen}
        selectedDate={activeDate}
        todayUTC={todayUTC}
        datesWithAttendance={datesWithAttendance}
        onSelectDate={handleSelectActiveDate}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
};
