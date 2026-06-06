import React, { useState, useEffect } from 'react';
import { submitFinalExam, subscribeToExamResults } from '../firebase';

export default function FinalResults({ gradings, exam, studentInfo, sessionId, onRestart, showToast }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  const [leaderboard, setLeaderboard] = useState([]);

  // Tính tổng điểm (trung bình dựa trên TỔNG SỐ CÂU HỎI của đề, không phải số câu đã làm)
  // Tính tổng điểm các câu đã làm
  const totalEarnedScore = gradings.reduce((sum, g) => sum + (g.score || 0), 0);
  const totalQuestions = exam.questions?.length || 1;
  const totalScore = Math.round(totalEarnedScore / totalQuestions);

  const correctCount = gradings.filter((g) => g.status === 'correct').length;
  const partialCount = gradings.filter((g) => g.status === 'partial').length;
  const incorrectCount = gradings.filter((g) => g.status === 'incorrect').length;

  const hasSaved = React.useRef(false);

  // Tự động lưu kết quả vào Firebase
  useEffect(() => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    const doSave = async () => {
      setIsSaving(true);
      try {
        // Xóa bản nháp khỏi LocalStorage
        localStorage.removeItem(`draft_${exam.id}_${studentInfo.name}`);

        await submitFinalExam(sessionId, {
          totalScore,
          questionDetails: gradings.map((g) => ({
            questionIndex: g.questionIndex,
            questionNumber: g.questionNumber,
            score: g.score,
            status: g.status,
            feedback: g.feedback,
          })),
        });
        setSaved(true);
        showToast('Kết quả đã được lưu vào hệ thống!');
      } catch (err) {
        setSaveError('Không thể lưu kết quả: ' + err.message);
        showToast('Lỗi lưu kết quả: ' + err.message, 'error');
        hasSaved.current = false;
      } finally {
        setIsSaving(false);
      }
    };
    doSave();
  }, [exam.id, gradings, sessionId, showToast, studentInfo.name, totalScore]);

  // Nếu bật tính năng BXH, lắng nghe kết quả từ Firebase
  useEffect(() => {
    if (!exam.leaderboardEnabled) return;

    const unsubscribe = subscribeToExamResults(exam.id, (results) => {
      // Lọc ra các bạn đã hoàn thành để xếp hạng
      const completed = results.filter(r => r.status === 'completed');
      setLeaderboard(completed);
    });

    return () => unsubscribe();
  }, [exam.id, exam.leaderboardEnabled]);

  const scoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
  const statusIcon = (st) => st === 'correct' ? '✅' : st === 'partial' ? '⚠️' : '❌';
  const statusLabel = (st) => st === 'correct' ? 'Đúng' : st === 'partial' ? 'Gần đúng' : 'Sai';

  const getMessage = () => {
    if (totalScore >= 90) return { emoji: '🏆', text: 'Xuất sắc! Bạn đã làm rất tốt!' };
    if (totalScore >= 75) return { emoji: '🎉', text: 'Tốt lắm! Bạn đã nắm vững kiến thức!' };
    if (totalScore >= 50) return { emoji: '💪', text: 'Khá tốt! Hãy ôn lại những câu còn yếu.' };
    return { emoji: '📚', text: 'Cần cố gắng thêm! Đừng bỏ cuộc nhé.' };
  };
  const msg = getMessage();

  return (
    <div className="flex-1 bg-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        
        {/* Cột trái (hoặc phía trên trên mobile): Kết quả cá nhân */}
        <div className={`space-y-6 ${exam.leaderboardEnabled ? 'md:col-span-2' : 'md:col-span-3 max-w-3xl mx-auto'}`}>
          <div className="text-center">
            <div className="text-6xl mb-3">{msg.emoji}</div>
            <h1 className="text-white font-black text-3xl mb-2">Hoàn Thành Bài Thi!</h1>
            <p className="text-slate-400">{studentInfo.name} · Lớp {studentInfo.className}</p>
            <p className="text-slate-500 text-sm">{exam.title}</p>
          </div>

          <div className={`bg-gradient-to-br rounded-3xl border p-8 text-center ${
            totalScore >= 80 ? 'from-emerald-950/60 to-slate-900 border-emerald-700/40'
            : totalScore >= 50 ? 'from-amber-950/60 to-slate-900 border-amber-700/40'
            : 'from-red-950/60 to-slate-900 border-red-700/40'
          }`}>
            <div className={`text-8xl font-black mb-1 ${scoreColor(totalScore)}`}>
              {totalScore}
            </div>
            <div className="text-slate-400 text-lg font-semibold mb-4">/ 100 điểm</div>
            <p className={`font-bold text-lg ${scoreColor(totalScore)}`}>{msg.text}</p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { label: 'Đúng', count: correctCount, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' },
                { label: 'Gần đúng', count: partialCount, color: 'text-amber-400 bg-amber-950/40 border-amber-800/40' },
                { label: 'Sai', count: incorrectCount, color: 'text-red-400 bg-red-950/40 border-red-800/40' },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-3 ${s.color}`}>
                  <div className="text-2xl font-black">{s.count}</div>
                  <div className="text-xs font-semibold opacity-80">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-semibold ${
            isSaving ? 'bg-slate-800/50 border-slate-700 text-slate-400'
            : saved ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
            : saveError ? 'bg-red-950/40 border-red-800/40 text-red-400'
            : ''
          }`}>
            {isSaving && <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Đang lưu kết quả vào database...</>}
            {saved && <><span className="text-lg">✅</span> Kết quả đã được lưu! </>}
            {saveError && <><span className="text-lg">⚠️</span> {saveError}</>}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-bold text-lg">📋 Chi Tiết Từng Câu</h2>
            </div>
            <div className="divide-y divide-slate-800">
              {gradings.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  Bạn chưa nộp được câu nào.
                </div>
              ) : (
                gradings.map((g, i) => (
                  <div key={i} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                          {g.questionNumber}
                        </div>
                        <p className="text-slate-300 text-sm leading-snug line-clamp-2">
                          {g.questionText}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-2xl font-black ${scoreColor(g.score)}`}>{g.score}</div>
                        <div className="text-slate-500 text-xs">/100</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{statusIcon(g.status)}</span>
                      <span className={`text-xs font-bold ${
                        g.status === 'correct' ? 'text-emerald-400'
                        : g.status === 'partial' ? 'text-amber-400'
                        : 'text-red-400'
                      }`}>
                        {statusLabel(g.status)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/50">
                      {g.feedback}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRestart}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition cursor-pointer"
            >
              🏠 Về Trang Chủ
            </button>
          </div>
        </div>

        {/* Cột phải: Live Leaderboard */}
        {exam.leaderboardEnabled && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden sticky top-6">
              <div className="bg-gradient-to-r from-indigo-600/20 to-violet-600/20 px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <span>🏆</span> Bảng Xếp Hạng
                </h2>
                <p className="text-indigo-300 text-xs mt-1">Cập nhật trực tiếp (Real-time)</p>
              </div>
              
              <div className="divide-y divide-slate-800/50">
                {leaderboard.length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">
                    Chưa có học sinh nào hoàn thành.
                  </div>
                ) : (
                  leaderboard.slice(0, 10).map((r, index) => {
                    // Highlight chính học sinh này
                    const isMe = r.id === sessionId;
                    return (
                      <div key={r.id} className={`px-5 py-3 flex items-center justify-between ${isMe ? 'bg-indigo-900/40 border-l-2 border-indigo-500' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`font-bold w-5 text-center ${
                            index === 0 ? 'text-yellow-400 text-lg'
                            : index === 1 ? 'text-slate-300 text-lg'
                            : index === 2 ? 'text-amber-600 text-lg'
                            : 'text-slate-500 text-sm'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className={`font-semibold text-sm truncate ${isMe ? 'text-white' : 'text-slate-300'}`}>
                              {r.studentName} {isMe && <span className="text-indigo-400 text-xs ml-1">(Bạn)</span>}
                            </p>
                            <p className="text-slate-500 text-xs truncate">{r.className}</p>
                          </div>
                        </div>
                        <div className={`font-black ml-3 flex-shrink-0 ${scoreColor(r.totalScore)}`}>
                          {r.totalScore}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
