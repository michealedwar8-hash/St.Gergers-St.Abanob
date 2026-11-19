import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { HomeScreen } from './components/HomeScreen';
import { Workspace } from './components/Workspace';
import { ToastContainer } from './components/ToastContainer';

const AppShell: React.FC = () => {
  const { activeGroupId } = useApp();

  return (
    <>
      {activeGroupId ? <Workspace groupId={activeGroupId} /> : <HomeScreen />}
      <ToastContainer />
    </>
  );
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'حدث خطأ غير متوقع أثناء تحميل الصفحة.' };
  }

  componentDidCatch(error: Error) {
    console.error('App render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl shadow-lg p-6 text-center space-y-4">
            <h1 className="text-xl font-extrabold text-rose-700">تعذر عرض الصفحة مؤقتاً</h1>
            <p className="text-sm text-slate-600 leading-relaxed">{this.state.message}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 cursor-pointer"
              >
                إعادة تحميل الصفحة
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('sunday_school_attendance_data_v1');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 cursor-pointer"
              >
                إعادة ضبط الذاكرة المحلية
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AppErrorBoundary>
  );
}
