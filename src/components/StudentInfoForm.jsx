import React, { useState, useEffect } from 'react';
import { getActiveExam, initExamSession } from '../firebase';

export default function StudentInfoForm({ onStart, onBack, showToast }) {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [activeExam, setActiveExam] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      setLoadingExam(true);
      try {
        const exam = await getActiveExam();
        setActiveExam(exam);
      } catch (e) {
        showToast('Lỗi kết nối Firebase: ' + e.message, 'error');
      } finally {
        setLoadingExam(false);
      }
    };
    fetchExam();
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Vui lòng nhập họ và tên!', 'error'); return; }
    if (!className.trim()) { showToast('Vui lòng nhập lớp!', 'error'); return; }
    if (!activeExam) { showToast('Hiện tại chưa có đề thi nào được mở!', 'error'); return; }
    
    setIsStarting(true);
    try {
      const studentName = name.trim();
      const draftKey = `draft_${activeExam.id}_${studentName}`;
      const draftDataStr = localStorage.getItem(draftKey);
      
      let sessionId = null;
      let initialDraft = null;

      if (draftDataStr) {
        const confirmRestore = window.confirm('Phát hiện bài làm dang dở của bạn trước đó. Bạn có muốn khôi phục lại không? (Chọn Cancel để làm lại từ đầu)');
        if (confirmRestore) {
          const draftData = JSON.parse(draftDataStr);
          sessionId = draftData.sessionId; // Dùng lại sessionId cũ
          initialDraft = draftData;
        } else {
          // Xóa draft cũ nếu muốn làm lại từ đầu
          localStorage.removeItem(draftKey);
        }
      }

      // Nếu không có draft hoặc học sinh chọn không khôi phục
      if (!sessionId) {
        sessionId = await initExamSession({
          studentName,
          className: className.trim(),
          examId: activeExam.id,
          examTitle: activeExam.title,
        });
      }

      onStart(
        { name: studentName, className: className.trim() },
        activeExam,
        sessionId,
        initialDraft
      );

    } catch (err) {
      showToast('Lỗi khởi tạo phiên thi: ' + err.message, 'error');
      setIsStarting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg animate-fade-in">
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-8 text-sm font-medium group cursor-pointer"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Quay về trang chủ
        </button>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Loading state */}
          {loadingExam && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-400 text-sm">Đang kiểm tra đề thi...</p>
            </div>
          )}

          {/* No active exam */}
          {!loadingExam && !activeExam && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-white font-bold text-xl mb-2">Chưa có đề thi</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Hiện tại giáo viên chưa mở đề thi nào. Vui lòng chờ giáo viên kích hoạt đề và thử lại.
              </p>
              <button
                onClick={() => { setLoadingExam(true); getActiveExam().then(setActiveExam).finally(() => setLoadingExam(false)); }}
                className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                🔄 Kiểm tra lại
              </button>
            </div>
          )}

          {/* Exam found → show form */}
          {!loadingExam && activeExam && (
            <>
              {/* Exam info banner */}
              <div className="bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-b border-indigo-500/20 px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600/40 border border-indigo-500/40 rounded-xl">
                    <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-0.5">Đề thi đang mở</p>
                    <h2 className="text-white font-black text-lg leading-tight">{activeExam.title}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {activeExam.questions?.length || 0} câu hỏi · Python · {activeExam.duration ? `${activeExam.duration} phút` : 'Không giới hạn thời gian'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student info form */}
              <form onSubmit={handleStart} className="p-8 space-y-5">
                <div className="text-center mb-6">
                  <h3 className="text-white font-bold text-xl">Thông tin học sinh</h3>
                  <p className="text-slate-400 text-sm mt-1">Nhập đúng tên và lớp để lưu kết quả</p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Họ và Tên <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    autoFocus
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Lớp <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="student-class"
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Ví dụ: Python-Beginner, Lớp 6A..."
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition text-sm"
                  />
                </div>

                {/* Checklist */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                  {[
                    'Hệ thống tự động lưu nháp chống mất bài',
                    'Cảnh báo gian lận nếu chuyển đổi Tab hoặc thoát trình duyệt',
                    activeExam.duration ? `Hết ${activeExam.duration} phút hệ thống sẽ tự nộp bài` : 'Kết quả sẽ được lưu tự động sau khi nộp',
                  ].map((rule) => (
                    <div key={rule} className="flex items-start gap-2.5 text-xs text-slate-400">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">✓</span>
                      {rule}
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <button
                  id="btn-start-exam"
                  type="submit"
                  disabled={isStarting}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer text-base"
                >
                  {isStarting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang chuẩn bị...</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg> Bắt Đầu Làm Bài!</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
