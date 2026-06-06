import React from 'react';

export default function WelcomeScreen({ onStudentStart, onTeacherLogin }) {
  return (
    <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center min-h-screen">
      {/* ── Animated gradient background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Logo / Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            {/* Floating badges */}
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg animate-bounce">
              AI
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
          Exam
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">AI</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-3 leading-relaxed">
          Hệ thống kiểm tra lập trình <span className="text-white font-semibold">Python</span> thông minh
        </p>
        <p className="text-slate-500 text-sm mb-12">
          Giáo viên upload đề thi → AI phân tích → Học sinh làm bài → Chấm điểm tự động
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: '🤖', text: 'AI Chấm Điểm' },
            { icon: '💡', text: 'Gợi Ý Thông Minh' },
            { icon: '▶️', text: 'Chạy Python Thật' },
            { icon: '📊', text: 'Lưu Kết Quả' },
          ].map((f) => (
            <span
              key={f.text}
              className="px-4 py-2 bg-slate-800/60 border border-slate-700/60 rounded-full text-slate-300 text-sm font-medium backdrop-blur-sm"
            >
              {f.icon} {f.text}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Student button */}
          <button
            id="btn-student-start"
            onClick={onStudentStart}
            className="group relative px-8 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all duration-300 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="relative z-10 flex items-center gap-3 justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Vào Làm Bài
            </span>
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Teacher button */}
          <button
            id="btn-teacher-login"
            onClick={onTeacherLogin}
            className="px-8 py-5 bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white font-bold text-lg rounded-2xl border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <span className="flex items-center gap-3 justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              Giáo Viên
            </span>
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-slate-600 text-xs">
          MindX Technology School · ExamAI v2.0
        </p>
      </div>
    </div>
  );
}
