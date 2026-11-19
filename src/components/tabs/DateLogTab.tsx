import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  FileSpreadsheet,
  Printer,
  Sparkles,
} from 'lucide-react';
import { GroupId, SpiritualElement } from '../../types';
import { GROUP_CONFIG_MAP, SPIRITUAL_ELEMENTS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  exportRowsToExcel,
  formatArabicDateFull,
  formatCheckInTime,
  normalizeArabic,
  normalizeDateKey,
} from '../../utils/helpers';
import { ArabicCalendarModal } from '../ArabicCalendarModal';
import { PhoneActions } from '../PhoneActions';

interface DateLogTabProps {
  groupId: GroupId;
  searchQuery: string;
}

export const DateLogTab: React.FC<DateLogTabProps> = ({
  groupId,
  searchQuery,
}) => {
  const { groupsData, todayUTC, addToast } = useApp();
  const { members, logs } = groupsData[groupId];
  const groupConfig = GROUP_CONFIG_MAP[groupId];

  const [selectedDate, setSelectedDate] = useState<string>(todayUTC);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset to todayUTC whenever group changes or day rolls over
  useEffect(() => {
    setSelectedDate(todayUTC);
  }, [groupId, todayUTC]);

  const datesWithAttendance = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      if (log.type === 'attendance') {
        set.add(normalizeDateKey(log.date));
      }
    }
    return set;
  }, [logs]);

  const dayRows = useMemo(() => {
    const attendanceMap = new Map<string, string>();
    const elementsMap = new Map<string, Set<SpiritualElement>>();
    const normalizedTarget = normalizeDateKey(selectedDate);

    for (const log of logs) {
      if (normalizeDateKey(log.date) !== normalizedTarget) continue;
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
        timestampUTC: attendanceMap.get(member.id) || '',
        checkedElements: elementsMap.get(member.id) || new Set<SpiritualElement>(),
      }))
      .sort((a, b) => (a.timestampUTC > b.timestampUTC ? -1 : 1));
  }, [members, logs, selectedDate, searchQuery]);

  const handleExportDay = () => {
    if (dayRows.length === 0) {
      addToast('لا توجد سجلات حضور لتصديرها في هذا التاريخ', 'info');
      return;
    }
    const rows = dayRows.map((item, idx) => ({
      'م': idx + 1,
      'الاسم': item.member.name,
      'رقم التليفون': item.member.phone,
      'العنوان': item.member.address,
      'وقت التسجيل': formatCheckInTime(item.timestampUTC),
      'العناصر الروحية': SPIRITUAL_ELEMENTS.filter((el) =>
        item.checkedElements.has(el.key)
      )
        .map((el) => el.label)
        .join('، '),
      'ملاحظات': item.member.notes,
    }));
    exportRowsToExcel(
      rows,
      `حضور_${selectedDate}`,
      `كشف_حضور_${groupConfig.stageLabel}_${selectedDate}.xlsx`
    );
    addToast(`تم تصدير كشف حضور ${selectedDate} بنجاح`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Control Header */}
      <div className="bg-white rounded-3xl border border-sky-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="no-print inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-l from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-md transition-all cursor-pointer"
          >
            <CalendarDays className="w-6 h-6" />
            <div className="text-right">
              <div className="text-xs text-sky-100 font-bold">
                اضغط لاختيار أي تاريخ من التقويم
              </div>
              <div className="text-base font-black">
                {formatArabicDateFull(selectedDate)}{' '}
                <span className="font-mono-num text-sm">({selectedDate})</span>
              </div>
            </div>
          </button>

          <div className="px-4 py-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 font-extrabold text-base tabular-nums">
            إجمالي الحضور في هذا اليوم: {dayRows.length} مخدوم
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportDay}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير كشف اليوم (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الكشف</span>
          </button>
        </div>
      </div>

      {/* Print-only Heading */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-2xl font-black">{groupConfig.workspaceTitle}</h2>
        <p className="text-base font-bold">
          كشف الحضور بتاريخ: {formatArabicDateFull(selectedDate)} ({selectedDate}) — العدد:{' '}
          {dayRows.length}
        </p>
      </div>

      {/* Attendance List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {dayRows.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <CalendarDays className="w-9 h-9" />
            </div>
            <h4 className="text-2xl font-extrabold text-slate-800">
              لا يوجد حضور مسجل بتاريخ {selectedDate}
            </h4>
            <p className="text-base font-semibold text-slate-600">
              يمكنك الضغط على زر التقويم أعلاه لاختيار تاريخ آخر عليه نقطة خضراء (يوجد به حضور مسجل).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[960px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-4 font-extrabold text-base">#</th>
                  <th className="px-4 py-4 font-extrabold text-base">الاسم</th>
                  <th className="px-4 py-4 font-extrabold text-base">التليفون</th>
                  <th className="px-4 py-4 font-extrabold text-base">العنوان</th>
                  <th className="px-4 py-4 font-extrabold text-base">وقت تسجيل الحضور</th>
                  <th className="px-4 py-4 font-extrabold text-base">العناصر الروحية المسجلة</th>
                  <th className="px-4 py-4 font-extrabold text-base">ملاحظات (مباشر)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dayRows.map(({ member, timestampUTC, checkedElements }, idx) => (
                  <tr key={member.id} className="hover:bg-sky-50/40 transition-colors">
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
                        <span className="no-print">
                          <PhoneActions phone={member.phone} notes={member.notes} />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">
                      {member.address || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-mono-num font-bold text-sm whitespace-nowrap">
                        <Clock className="w-4 h-4 text-sky-600" />
                        {formatCheckInTime(timestampUTC)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {checkedElements.size === 0 ? (
                        <span className="text-xs font-semibold text-slate-400">—</span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ArabicCalendarModal
        isOpen={calendarOpen}
        selectedDate={selectedDate}
        todayUTC={todayUTC}
        datesWithAttendance={datesWithAttendance}
        onSelectDate={setSelectedDate}
        onClose={() => setCalendarOpen(false)}
        title="اختر تاريخاً لعرض كشف الحضور"
      />
    </div>
  );
};
