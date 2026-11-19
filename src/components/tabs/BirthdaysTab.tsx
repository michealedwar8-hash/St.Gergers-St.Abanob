import React, { useMemo, useState } from 'react';
import { Cake, CalendarHeart, Gift, PartyPopper } from 'lucide-react';
import { GroupId, TabId } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  ARABIC_MONTHS,
  formatArabicDateShort,
  getBirthdayInfo,
  normalizeArabic,
} from '../../utils/helpers';
import { PhoneActions } from '../PhoneActions';

interface BirthdaysTabProps {
  groupId: GroupId;
  searchQuery: string;
  onJumpToTab: (tab: TabId) => void;
}

export const BirthdaysTab: React.FC<BirthdaysTabProps> = ({
  groupId,
  searchQuery,
  onJumpToTab,
}) => {
  const { groupsData, todayUTC } = useApp();
  const { members } = groupsData[groupId];
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = all

  const membersWithBirthday = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return members
      .map((member) => {
        const info = getBirthdayInfo(member.birthDate, todayUTC);
        if (!info) return null;
        return { member, info };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter(({ member }) =>
        !q
          ? true
          : normalizeArabic(member.name).includes(q) ||
            normalizeArabic(member.notes).includes(q)
      )
      .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining);
  }, [members, todayUTC, searchQuery]);

  const todaysBirthdays = useMemo(
    () => membersWithBirthday.filter((x) => x.info.isToday),
    [membersWithBirthday]
  );

  const upcomingBirthdays = useMemo(
    () =>
      membersWithBirthday.filter(
        (x) => !x.info.isToday && (x.info.isThisMonth || x.info.isCurrentCalendarMonth)
      ),
    [membersWithBirthday]
  );

  const filteredList = useMemo(() => {
    if (selectedMonth === 0) return membersWithBirthday;
    return membersWithBirthday.filter((x) => x.info.month === selectedMonth);
  }, [membersWithBirthday, selectedMonth]);

  return (
    <div className="space-y-5">
      {/* Celebratory Highlight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Birthdays */}
        <div className="rounded-2xl bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 text-white p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black">أعياد ميلاد اليوم</h3>
                <p className="text-amber-100 text-xs font-bold">
                  تهنئة فورية لأبنائنا المحتفلين اليوم
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-white/25 font-black font-mono-num text-lg">
              {todaysBirthdays.length}
            </span>
          </div>

          {todaysBirthdays.length === 0 ? (
            <div className="rounded-xl bg-white/15 p-3 text-center font-bold text-sm">
              لا توجد أعياد ميلاد مسجلة لليوم ({todayUTC})
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaysBirthdays.map(({ member, info }) => (
                <div
                  key={member.id}
                  className="bg-white text-slate-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-sm"
                >
                  <div>
                    <p className="font-black text-base text-rose-700">{member.name}</p>
                    <p className="text-xs font-bold text-slate-600">
                      يتم اليوم {info.upcomingAge} سنة 🎉
                    </p>
                  </div>
                  <PhoneActions
                    phone={member.phone}
                    notes={member.notes}
                    whatsappLabel="تهنئة واتساب"
                    whatsappMessage={`كل سنة وأنت طيب يا ${member.name}! 🎂🎉 عيد ميلاد سعيد ومبارك وعقبال سنين كتير حلوة مع المسيح — من أسرة مدارس الأحد 🤍`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Birthdays This Month / Next 30 Days */}
        <div className="rounded-2xl bg-gradient-to-l from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black">أعياد الميلاد القادمة (هذا الشهر / 30 يوم)</h3>
                <p className="text-indigo-100 text-xs font-bold">
                  الاسم والعمر مع زر اتصال وتهنئة واتساب مباشرة
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-white/25 font-black font-mono-num text-lg">
              {upcomingBirthdays.length}
            </span>
          </div>

          {upcomingBirthdays.length === 0 ? (
            <div className="rounded-xl bg-white/15 p-3 text-center font-bold text-sm">
              لا توجد أعياد ميلاد قادمة خلال هذا الشهر أو الـ 30 يوماً المقبلة
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pl-1">
              {upcomingBirthdays.map(({ member, info }) => (
                <div
                  key={member.id}
                  className="bg-white/95 text-slate-900 rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm truncate">{member.name}</p>
                    <p className="text-xs font-bold text-indigo-700">
                      {info.day} {ARABIC_MONTHS[info.month - 1]} • بعد {info.daysRemaining}{' '}
                      {info.daysRemaining === 1 ? 'يوم' : 'أيام'} — يتم {info.upcomingAge} سنة
                    </p>
                  </div>
                  <PhoneActions
                    phone={member.phone}
                    notes={member.notes}
                    whatsappLabel="واتساب"
                    whatsappMessage={`كل سنة وأنت طيب مقدماً يا ${member.name}! 🎂🎉 عيد ميلاد سعيد من أسرة مدارس الأحد 🤍`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Month Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <CalendarHeart className="w-5 h-5 text-rose-600" />
          <span className="font-extrabold text-base text-slate-800">تصفية حسب الشهر:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonth(0)}
            className={`px-4 py-2 rounded-xl font-extrabold text-sm cursor-pointer border transition-colors ${
              selectedMonth === 0
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-rose-50'
            }`}
          >
            الكل ({membersWithBirthday.length})
          </button>
          {ARABIC_MONTHS.map((mName, idx) => {
            const monthNum = idx + 1;
            const count = membersWithBirthday.filter((x) => x.info.month === monthNum).length;
            return (
              <button
                key={mName}
                type="button"
                onClick={() => setSelectedMonth(monthNum)}
                className={`px-3.5 py-2 rounded-xl font-extrabold text-sm cursor-pointer border transition-colors ${
                  selectedMonth === monthNum
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-rose-50'
                }`}
              >
                {mName}{' '}
                {count > 0 && (
                  <span className="font-mono-num opacity-85">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Birthdays Table or Friendly Empty State */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {membersWithBirthday.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Cake className="w-9 h-9" />
            </div>
            <h4 className="text-2xl font-extrabold text-slate-800">
              لم يتم إدخال تواريخ الميلاد بعد
            </h4>
            <p className="text-base font-semibold text-slate-600 max-w-lg mx-auto">
              بمجرد إضافة تاريخ ميلاد أي مخدوم في تبويب «السجل الرئيسي»، سيظهر تلقائياً هنا مع حساب العمر والأيام المتبقية وزر تهنئة واتساب المباشر.
            </p>
            <button
              type="button"
              onClick={() => onJumpToTab('main')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base shadow-sm cursor-pointer"
            >
              الانتقال إلى السجل الرئيسي لإضافة تواريخ الميلاد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[960px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-4 font-extrabold text-base">الاسم</th>
                  <th className="px-4 py-4 font-extrabold text-base">تاريخ الميلاد</th>
                  <th className="px-4 py-4 font-extrabold text-base text-center">العمر القادم</th>
                  <th className="px-4 py-4 font-extrabold text-base text-center">المتبقي</th>
                  <th className="px-4 py-4 font-extrabold text-base">التليفون وتهنئة واتساب</th>
                  <th className="px-4 py-4 font-extrabold text-base">العنوان</th>
                  <th className="px-4 py-4 font-extrabold text-base">ملاحظات (مباشر)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-600 font-bold text-lg">
                      لا توجد أعياد ميلاد مسجلة في شهر {ARABIC_MONTHS[selectedMonth - 1]}
                    </td>
                  </tr>
                ) : (
                  filteredList.map(({ member, info }) => (
                    <tr
                      key={member.id}
                      className={
                        info.isToday
                          ? 'bg-amber-50 hover:bg-amber-100/70'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="px-4 py-3.5 font-extrabold text-base text-slate-900">
                        {member.name}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-sm text-slate-800">
                        <div>{formatArabicDateShort(info.normalizedDate)}</div>
                        <div className="font-mono-num text-xs text-slate-500">
                          {info.normalizedDate}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-3 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-extrabold font-mono-num text-sm">
                          {info.upcomingAge} سنة
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {info.isToday ? (
                          <span className="inline-block px-3 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-sm">
                            اليوم 🎉
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-3 py-1 rounded-lg font-extrabold text-sm border ${
                              info.isThisWeek
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            بعد {info.daysRemaining}{' '}
                            {info.daysRemaining === 1 ? 'يوم' : 'أيام'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {member.phone && (
                            <span className="font-mono-num text-sm font-bold text-slate-700">
                              {member.phone}
                            </span>
                          )}
                          <PhoneActions
                            phone={member.phone}
                            notes={member.notes}
                            whatsappLabel="تهنئة عيد ميلاد"
                            whatsappMessage={`كل سنة وأنت طيب يا ${member.name}! 🎂🎉 عيد ميلاد سعيد ومبارك من أسرة مدارس الأحد 🤍`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">
                        {member.address || <span className="text-slate-400">—</span>}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
