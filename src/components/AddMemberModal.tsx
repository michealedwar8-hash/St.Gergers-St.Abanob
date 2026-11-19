import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Member } from '../types';

interface AddMemberModalProps {
  isOpen: boolean;
  groupTitle: string;
  onAdd: (member: Omit<Member, 'id'>) => void;
  onClose: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  groupTitle,
  onAdd,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم المخدوم');
      return;
    }
    onAdd({
      name: name.trim(),
      phone: phone.trim(),
      birthDate: birthDate.trim(),
      address: address.trim(),
      notes: notes.trim(),
    });
    setName('');
    setPhone('');
    setBirthDate('');
    setAddress('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[95vw] sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-l from-indigo-600 to-blue-600 text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold truncate">إضافة مخدوم جديد</h3>
              <p className="text-indigo-100 text-xs font-semibold truncate">{groupTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1">
              اسم المخدوم <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="مثال: أبانوب مرقس يوسف"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white transition-colors"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1">
                رقم التليفون
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm font-bold font-mono-num text-right text-slate-900 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1">
                تاريخ الميلاد
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm font-bold font-mono-num text-slate-900 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1">
              العنوان
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="اسم الشارع / المنطقة / الدور..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات خاصة بالافتقاد أو المتابعة..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-extrabold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
            >
              حفظ وإضافة المخدوم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
