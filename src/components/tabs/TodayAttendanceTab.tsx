import React, { useMemo } from 'react';
import { CalendarCheck2, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { GroupId, SpiritualElement, TabId } from '../../types';
import { SPIRITUAL_ELEMENTS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  formatArabicDateFull,
  formatCheckInTime,
  normalizeArabic,
  normalizeDateKey,
} from '../../utils/helpers';
import { PhoneActions } from '../PhoneActions';

interface TodayAttendanceTabProps {
  groupId: GroupId;
  searchQuery: string;
  onJumpToTab: (tab: TabId) => void;
}

export const TodayAttendanceTab: React.FC<TodayAttendanceTabProps> = ({
  groupId,
  searchQuery,
  onJumpToTab,
}) => {
  const { groupsData, todayUTC } = useApp();
  const { members, logs } = groupsData[groupId];

  const todayPresentRows = useMemo(() => {
    const attendanceMap = new Map<string, string>(); // memberId -> timestampUTC
    const elementsMap = new Map<string, Set<SpiritualElement>>();

    for (const log of logs) {
      if (normalizeDateKey(log.date) !== todayUTC) continue;
      if (log.type === 'attendance') {
        if (!attendanceMap.has(log.memberId)) {
          attendanceMap.set(log.memberId, log.timestampUTC);
        }
      } else if (log.type !== 'visitation') {
        let set = elementsMap.get(log.memberId);
        if (!set) {
          set = new Set<SpiritualElement>();
          elementsMap.set(log.memberId, set);
        }
        set.add(log.type);
      }
    }

    const q = normalizeArabic(searchQuery);
    return members
      .filter((m) => attendanceMap.has(m.id))
      .filter((m) =>
        !q
          ? true
          : normalizeArabic(m.name).includes(q) ||
            normalizeArabic(m.notes).includes(q)
      )
      .map((member) => ({
        member,
        checkInTimestamp: attendanceMap.get(member.id) || '',
        checkedElements: elementsMap.get(member.id) || new Set<SpiritualElement>(),
      }))
      .sort((a, b) => (a.checkInTimestamp > b.checkInTimestamp ? -1 : 1));
  }, [members, logs, todayUTC, searchQuery]);

  const totalPresentAll = useMemo(() => {
    const ids = new Set<string>();
    for (const log of logs) {
      if (normalizeDateKey(log.date) === todayUTC && log.type === 'attendance') {
        ids.add(log.memberId);
      }
    }
    return ids.size;
  }, [logs, todayUTC]);

  const percentage =
    members.length > 0 ? Math.round((totalPresentAll / members.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Live Today Banner & Attendance Percentage Bar */}
      <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CalendarCheck2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                حضور اليوم الفعلي (مباشر)
              </h3>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                {formatArabicDateFull(todayUTC)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-extrabold text-emerald-800">الحاضرون اليوم</p>
              <p className="text-2xl font-black font-mono-num text-emerald-700">
                {totalPresentAll} / {members.length}
              </p>
            </div>
            <div className="text-center px-5 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-200">
              <p className="text-xs font-extrabold text-indigo-800">نسبة الحضور</p>
              <p className="text-2xl font-black font-mono-num text-indigo-700">
                {percentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <p className="text-xs font-bold text-slate-500">
            هذه اللوحة تعرض دائماً حضور تاريخ اليوم العالمي الفعلي تلقائياً بشكل مستقل عن أي تاريخ سابق تختاره في السجل الرئيسي.
          </p>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {todayPresentRows.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-2xl font-extrabold text-slate-800">
              لم يتم تسجيل حضور اليوم بعد
            </h4>
            <p className="text-base font-semibold text-slate-600 max-w-md mx-auto">
              ابدأ بتحديد علامة «الحضور» أمام أسماء الحاضرين في السجل الرئيسي لتظهر هنا فوراً مع وقت التسجيل الدقيق.
            </p>
            <button
              type="button"
              onClick={() => onJumpToTab('main')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-sm cursor-pointer"
            >
              تسجيل الحضور الآن في السجل الرئيسي
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[980px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-4 font-extrabold text-base">#</th>
                  <th className="px-4 py-4 font-extrabold text-base">الاسم</th>
                  <th className="px-4 py-4 font-extrabold text-base">التليفون</th>
                  <th className="px-4 py-4 font-extrabold text-base">العنوان</th>
                  <th className="px-4 py-4 font-extrabold text-base">وقت تسجيل الحضور</th>
                  <th className="px-4 py-4 font-extrabold text-base">
                    العناصر الروحية المسجلة اليوم
                  </th>
                  <th className="px-4 py-4 font-extrabold text-base">ملاحظات (مباشر)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {todayPresentRows.map(
                  ({ member, checkInTimestamp, checkedElements }, idx) => (
                    <tr
                      key={member.id}
                      className="hover:bg-emerald-50/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono-num font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-base text-slate-900">
                        {member.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {member.phone && (
                            <span className="font-mono-num text-sm font-bold text-slate-700">
                              {member.phone}
                            </span>
                          )}
                          <PhoneActions phone={member.phone} notes={member.notes} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">
                        {member.address || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-mono-num font-bold text-sm whitespace-nowrap">
                          <Clock className="w-4 h-4 text-sky-600" />
                          {formatCheckInTime(checkInTimestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {checkedElements.size === 0 ? (
                          <span className="text-xs font-semibold text-slate-400">
                            لم يُسجَّل عنصر روحي اليوم
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {SPIRITUAL_ELEMENTS.filter((el) =>
                              checkedElements.has(el.key)
                            ).map((el) => (
                              <span
                                key={el.key}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${el.colorClass}`}
                              >
                                <Sparkles className="w-3 h-3" />
                                {el.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-amber-950">
                        {member.notes ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                            {member.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
