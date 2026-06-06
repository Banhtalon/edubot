import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseReady } from './firebase';
import ThemeToggle from './components/ThemeToggle';
import WelcomeScreen from './components/WelcomeScreen';
import TeacherLogin from './components/TeacherLogin';
import TeacherDashboard from './components/TeacherDashboard';
import StudentInfoForm from './components/StudentInfoForm';
import QuizSession from './components/QuizSession';
import FinalResults from './components/FinalResults';

// Màn hình hướng dẫn khi chưa cấu hình Firebase
function FirebaseSetupScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-slate-900 border border-amber-700/50 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-white font-black text-2xl mb-2">Cần cấu hình Firebase</h1>
          <p className="text-slate-400 text-sm">App chưa kết nối được database. Làm theo các bước dưới đây:</p>
        </div>
        <ol className="space-y-4 text-sm">
          {[
            { n: 1, text: 'Vào console.firebase.google.com → Tạo project mới' },
            { n: 2, text: 'Bật Firestore Database (test mode) + Authentication (Email/Password)' },
            { n: 3, text: 'Project Settings → Your apps → Web → Lấy firebaseConfig' },
            { n: 4, text: 'Tạo file .env trong thư mục gốc dự án (xem .env.example)' },
            { n: 5, text: 'Khởi động lại: npm run dev' },
          ].map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="w-7 h-7 bg-amber-600/30 border border-amber-600/50 rounded-lg flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">{s.n}</span>
              <span className="text-slate-300 pt-0.5">{s.text}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 p-4 bg-slate-800 rounded-2xl border border-slate-700">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">File .env cần có:</p>
          <pre className="text-emerald-400 text-xs leading-relaxed">{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// APP STATES (State Machine):
// 'welcome'           → Trang chào mừng
// 'teacher_login'     → Màn hình đăng nhập giáo viên
// 'teacher_dashboard' → Bảng điều khiển giáo viên
// 'student_info'      → Học sinh nhập tên & lớp
// 'quiz'              → Phiên làm bài kiểm tra
// 'results'           → Kết quả sau khi hoàn thành
// =====================================================
export default function App() {
  const [appState, setAppState] = useState('welcome');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Gemini API Key (lưu localStorage)
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('gemini_api_key') || ''
  );

  const [studentInfo, setStudentInfo] = useState({ name: '', className: '' });
  const [activeExam, setActiveExam] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [initialDraft, setInitialDraft] = useState(null);
  const [quizGradings, setQuizGradings] = useState([]);

  // Hệ thống thông báo Toast
  const [notifications, setNotifications] = useState([]);

  // Lắng nghe trạng thái đăng nhập Firebase Auth
  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setAuthLoading(false);
      return;
    }
    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
      });
      return unsub;
    } catch (e) {
      console.error('Auth listener error:', e);
      setAuthLoading(false);
    }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      4500
    );
  }, []);

  const handleApiKeySave = useCallback((key) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    showToast('Đã lưu Gemini API Key!');
  }, [showToast]);

  // Học sinh bắt đầu làm bài
  const handleStudentStart = (info, exam, session, draft) => {
    setStudentInfo(info);
    setActiveExam(exam);
    setSessionId(session);
    setInitialDraft(draft);
    setAppState('quiz');
  };

  // Khi học sinh nộp bài xong
  const handleQuizComplete = (gradings) => {
    setQuizGradings(gradings);
    setAppState('results');
  };

  // Quay về trang đầu
  const handleRestart = () => {
    setAppState('welcome');
    setStudentInfo({ name: '', className: '' });
    setActiveExam(null);
    setSessionId(null);
    setInitialDraft(null);
    setQuizGradings([]);
  };

  // Chưa cấu hình Firebase → hiện hướng dẫn setup
  if (!isFirebaseReady) {
    return <FirebaseSetupScreen />;
  }

  // Loading spinner khi khởi tạo Firebase Auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Đang khởi động...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col">
      {/* ── Hệ thống Toast thông báo ── */}
      <div className="fixed top-5 right-5 z-50 space-y-3 pointer-events-none w-80">
        {notifications.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-2xl border pointer-events-auto flex items-center gap-3 animate-fade-in backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-800/60'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/60'
            }`}
          >
            <span className="text-xl flex-shrink-0">
              {toast.type === 'error' ? '❌' : '✅'}
            </span>
            <p className="text-sm font-semibold leading-snug">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* ── Header (chỉ hiển thị trong màn hình quiz / results) ── */}
      {(appState === 'quiz' || appState === 'results') && (
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 py-3 px-6 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-600/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-black text-white tracking-tight">ExamAI</span>
            </div>
            <div className="flex items-center gap-3">
              {studentInfo.name && (
                <span className="text-slate-400 text-sm hidden sm:block">
                  👤 {studentInfo.name} – Lớp {studentInfo.className}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      {/* ── Các màn hình theo State Machine ── */}
      {appState === 'welcome' && (
        <WelcomeScreen
          onStudentStart={() => setAppState('student_info')}
          onTeacherLogin={() => setAppState('teacher_login')}
        />
      )}

      {appState === 'teacher_login' && (
        <TeacherLogin
          onSuccess={() => setAppState('teacher_dashboard')}
          onBack={() => setAppState('welcome')}
          showToast={showToast}
        />
      )}

      {appState === 'teacher_dashboard' && (
        <TeacherDashboard
          user={currentUser}
          apiKey={apiKey}
          onApiKeySave={handleApiKeySave}
          onLogout={() => setAppState('welcome')}
          showToast={showToast}
        />
      )}

      {appState === 'student_info' && (
        <StudentInfoForm
          onStart={handleStudentStart}
          onBack={() => setAppState('welcome')}
          showToast={showToast}
        />
      )}

      {appState === 'quiz' && (
        <QuizSession
          exam={activeExam}
          studentInfo={studentInfo}
          sessionId={sessionId}
          initialDraft={initialDraft}
          apiKey={apiKey}
          onComplete={handleQuizComplete}
          showToast={showToast}
        />
      )}

      {appState === 'results' && (
        <FinalResults
          gradings={quizGradings}
          exam={activeExam}
          studentInfo={studentInfo}
          sessionId={sessionId}
          onRestart={handleRestart}
          showToast={showToast}
        />
      )}
    </div>
  );
}
