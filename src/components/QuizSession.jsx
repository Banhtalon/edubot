import React, { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { updateExamProgress } from '../firebase';

// ──── Gemini: Chấm điểm từng câu ────────────────────────────────────────
async function gradeStudentCode(questionText, sampleSolution, studentCode, apiKey) {
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Câu hỏi:\n${questionText}\n\nCode mẫu tham khảo:\n\`\`\`python\n${sampleSolution}\n\`\`\`\n\nCode học sinh nộp:\n\`\`\`python\n${studentCode}\n\`\`\``,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: `Bạn là giáo viên chấm bài Python. Chấm điểm code học sinh so với yêu cầu đề bài và code mẫu.
Tiêu chí: logic đúng (60%), cú pháp hợp lệ (20%), code sạch (20%).
Trả về JSON: score (0-100, integer), status ("correct"/"partial"/"incorrect"), feedback (nhận xét tiếng Việt ngắn gọn ≤ 80 từ, chỉ ra điểm sai và điểm cần cải thiện).`,
        },
      ],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          score: { type: 'INTEGER' },
          status: { type: 'STRING' },
          feedback: { type: 'STRING' },
        },
        required: ['score', 'status', 'feedback'],
      },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  if (!res.ok) throw new Error(`Gemini API lỗi: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận được phản hồi AI.');
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
}

// ──── QuizSession ────────────────────────────────────────────────────────
export default function QuizSession({ exam, studentInfo, sessionId, initialDraft, apiKey, onComplete, showToast }) {
  // Nếu có bản nháp, ưu tiên sử dụng
  const [currentIndex, setCurrentIndex] = useState(initialDraft?.currentIndex || 0);
  const [userCode, setUserCode] = useState(initialDraft?.userCode || '# Viết code Python của bạn tại đây\n\n');
  const [gradings, setGradings] = useState(initialDraft?.gradings || []);
  const [cheatCount, setCheatCount] = useState(initialDraft?.cheatCount || 0);
  
  // Thời gian đếm ngược (tính bằng giây). Nếu exam.duration === 0 thì không giới hạn.
  const initialTimeLeft = initialDraft?.timeLeft !== undefined 
    ? initialDraft.timeLeft 
    : (exam.duration ? exam.duration * 60 : null);
    
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  const [isGrading, setIsGrading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalType, setTerminalType] = useState('output');

  const [showResultPopup, setShowResultPopup] = useState(false);
  const [currentGrading, setCurrentGrading] = useState(null);
  const [hintsShown, setHintsShown] = useState(false);

  const currentQuestion = exam.questions[currentIndex];
  const totalQuestions = exam.questions.length;
  const progress = Math.round((currentIndex / totalQuestions) * 100);

  // ── Auto-save Draft (LocalStorage) ──
  useEffect(() => {
    const draftKey = `draft_${exam.id}_${studentInfo.name}`;
    const draftData = {
      sessionId,
      currentIndex,
      userCode,
      gradings,
      cheatCount,
      timeLeft
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [currentIndex, userCode, gradings, cheatCount, timeLeft, exam.id, studentInfo.name, sessionId]);

  // ── Countdown Timer ──
  useEffect(() => {
    if (timeLeft === null) return; // Không có timer
    if (timeLeft <= 0) {
      showToast('Đã hết thời gian làm bài! Hệ thống tự động nộp bài.', 'error');
      // Khi hết giờ, nộp những câu đã chấm (gradings hiện có)
      onComplete(gradings);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, gradings, onComplete, showToast]);

  // ── Anti-Cheat: Lắng nghe chuyển Tab ──
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const newCheatCount = cheatCount + 1;
        setCheatCount(newCheatCount);
        showToast(`⚠️ CẢNH BÁO GIAN LẬN! Hệ thống phát hiện bạn vừa rời khỏi trình duyệt. (Lần ${newCheatCount})`, 'error');
        
        // Báo ngay lên Firebase Live Monitor
        if (sessionId) {
          try {
            await updateExamProgress(sessionId, { cheatCount: newCheatCount });
          } catch (e) {
            console.error('Không thể cập nhật lỗi gian lận:', e);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [cheatCount, sessionId, showToast]);

  // Reset editor khi chuyển câu
  const resetForNextQuestion = () => {
    setUserCode('# Viết code Python của bạn tại đây\n\n');
    setTerminalOutput('');
    setHintsShown(false);
    setShowResultPopup(false);
    setCurrentGrading(null);
  };

  // Chuyển sang câu tiếp theo
  const goToNextQuestion = (updatedGradings) => {
    if (currentIndex + 1 >= totalQuestions) {
      // Hoàn thành tất cả câu
      onComplete(updatedGradings);
    } else {
      setCurrentIndex((i) => i + 1);
      resetForNextQuestion();
    }
  };

  // ── Gợi ý ──
  const handleShowHint = () => {
    if (hintsShown) {
      showToast('Bạn đã xem gợi ý cho câu này rồi!', 'error');
      return;
    }
    const hints = currentQuestion.hints || [];
    if (hints.length === 0) { showToast('Không có gợi ý cho câu này.', 'error'); return; }

    const hintBlock = [
      '# ╔══════════ 💡 GỢI Ý ══════════╗',
      ...hints.map((h, i) => `# ${i + 1}. ${h}`),
      '# ╚═══════════════════════════════╝',
      '',
    ].join('\n');

    const existingCode = userCode.startsWith('# Viết code') ? '' : '\n' + userCode;
    setUserCode(hintBlock + existingCode);
    setHintsShown(true);
    showToast('Đã thêm gợi ý vào editor!');
  };

  // ── Chạy Python với Pyodide ──
  const handleRunPython = async () => {
    if (!userCode.trim()) { showToast('Vui lòng viết code trước!', 'error'); return; }
    if (typeof window.loadPyodide === 'undefined') {
      showToast('Pyodide chưa tải. Vui lòng kiểm tra kết nối mạng!', 'error');
      return;
    }

    setIsRunning(true);
    setTerminalOutput('⏳ Đang tải môi trường Python...');
    setTerminalType('info');

    try {
      if (!window.pyodideInstance) {
        window.pyodideInstance = await window.loadPyodide();
      }
      const pyodide = window.pyodideInstance;

      let stdout = '';
      let stderr = '';
      pyodide.setStdout({ batched: (t) => { stdout += t + '\n'; } });
      pyodide.setStderr({ batched: (t) => { stderr += t + '\n'; } });

      await pyodide.runPythonAsync(userCode);

      if (stderr) {
        setTerminalOutput(stderr);
        setTerminalType('error');
      } else if (stdout.trim()) {
        setTerminalOutput(stdout);
        setTerminalType('output');
      } else {
        setTerminalOutput('✅ Code chạy thành công (không có output)');
        setTerminalType('output');
      }
    } catch (err) {
      setTerminalOutput('❌ ' + err.message);
      setTerminalType('error');
    } finally {
      setIsRunning(false);
    }
  };

  // ── Nộp bài & chấm điểm ──
  const handleSubmit = async () => {
    const codeToSubmit = userCode.trim();
    if (!codeToSubmit || codeToSubmit === '# Viết code Python của bạn tại đây') {
      showToast('Vui lòng viết code trước khi nộp!', 'error');
      return;
    }
    if (!apiKey) {
      showToast('Thiếu Gemini API Key! Liên hệ giáo viên.', 'error');
      return;
    }

    setIsGrading(true);
    showToast('AI đang chấm bài...');

    try {
      const result = await gradeStudentCode(
        currentQuestion.questionText,
        currentQuestion.sampleSolution,
        codeToSubmit,
        apiKey
      );

      const newGrading = {
        questionIndex: currentIndex,
        questionNumber: currentQuestion.questionNumber,
        questionText: currentQuestion.questionText,
        userCode: codeToSubmit,
        score: result.score,
        status: result.status,
        feedback: result.feedback,
      };
      const updatedGradings = [...gradings, newGrading];
      setGradings(updatedGradings);
      setCurrentGrading(result);
      setShowResultPopup(true);
    } catch (err) {
      showToast('Lỗi chấm bài: ' + err.message, 'error');
    } finally {
      setIsGrading(false);
    }
  };

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const scoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = (s) => s >= 80 ? 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/30' : s >= 50 ? 'from-amber-600/20 to-amber-600/5 border-amber-500/30' : 'from-red-600/20 to-red-600/5 border-red-500/30';

  return (
    <div className="flex-1 bg-slate-950 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">

        {/* ── Progress Bar & Timer ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-white font-black text-lg">
                Câu {currentIndex + 1}
                <span className="text-slate-500 font-normal text-base"> / {totalQuestions}</span>
              </span>
              <span className="bg-indigo-600/30 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-500/30">
                Python
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-lg ${
                  timeLeft <= 60 ? 'bg-red-950/50 text-red-400 border-red-500/40 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  ⏳ {formatTime(timeLeft)}
                </div>
              )}
              
              {/* Dot indicators */}
              <div className="flex gap-2">
                {exam.questions.map((_, i) => {
                  const g = gradings.find((gr) => gr.questionIndex === i);
                  return (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i === currentIndex
                          ? 'bg-indigo-500 scale-125'
                          : g
                          ? g.score >= 80 ? 'bg-emerald-500'
                            : g.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {/* Progress bar line */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Câu hỏi ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-sm">
              {currentQuestion.questionNumber}
            </div>
            <h2 className="text-indigo-300 font-bold text-sm uppercase tracking-wider mt-1.5">
              Đề bài
            </h2>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <p className="text-slate-100 leading-relaxed whitespace-pre-wrap text-[15px]">
              {currentQuestion.questionText}
            </p>
          </div>
        </div>

        {/* ── Code Editor ── */}
        <div 
          className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          onPasteCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            showToast('⚠️ Hệ thống chống gian lận: Không được phép dán (paste) code!', 'error');
          }}
          onDropCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            showToast('⚠️ Hệ thống chống gian lận: Không được phép kéo thả code!', 'error');
          }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-slate-400 text-xs font-mono ml-2">solution.py</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-xs italic">Đã bật chống Copy/Paste & Thoát Tab</span>
              {hintsShown && <span className="text-amber-400 text-xs flex items-center gap-1">💡 Đã xem gợi ý</span>}
            </div>
          </div>
          <CodeMirror
            value={userCode}
            height="320px"
            theme="dark"
            extensions={[python()]}
            onChange={setUserCode}
            editable={!isGrading}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
            }}
          />
        </div>

        {/* ── Terminal Output ── */}
        {terminalOutput && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800">
              <span className="text-slate-500 text-xs font-mono font-bold uppercase tracking-wider">
                Terminal Output
              </span>
              <button
                onClick={() => setTerminalOutput('')}
                className="text-slate-600 hover:text-slate-400 text-xs transition cursor-pointer"
              >
                Xóa ✕
              </button>
            </div>
            <pre
              className={`px-5 py-4 text-sm font-mono whitespace-pre-wrap leading-relaxed ${
                terminalType === 'error' ? 'text-red-400' : terminalType === 'info' ? 'text-blue-400' : 'text-emerald-400'
              }`}
            >
              {terminalOutput}
            </pre>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Gợi ý */}
          <button
            onClick={handleShowHint}
            disabled={hintsShown || isGrading}
            className="flex items-center gap-2 px-5 py-3 bg-amber-950/40 hover:bg-amber-950/60 text-amber-400 font-semibold text-sm rounded-xl border border-amber-800/40 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            💡 {hintsShown ? 'Đã xem gợi ý' : 'Gợi Ý'}
          </button>

          {/* Chạy thử */}
          <button
            onClick={handleRunPython}
            disabled={isRunning || isGrading}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-400 font-semibold text-sm rounded-xl border border-emerald-800/40 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRunning ? (
              <><div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Đang chạy...</>
            ) : (
              '▶ Chạy Thử'
            )}
          </button>

          {/* Nộp bài */}
          <button
            onClick={handleSubmit}
            disabled={isGrading || isRunning}
            className="ml-auto flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
          >
            {isGrading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang chấm...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Nộp Câu Này</>
            )}
          </button>
        </div>
      </div>

      {/* ── Result Popup (overlay) ── */}
      {showResultPopup && currentGrading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`bg-gradient-to-b ${scoreBg(currentGrading.score)} border bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl`}>
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full border-4 ${
                currentGrading.score >= 80 ? 'border-emerald-500 bg-emerald-950/30'
                : currentGrading.score >= 50 ? 'border-amber-500 bg-amber-950/30'
                : 'border-red-500 bg-red-950/30'
              } mb-4`}>
                <span className={`text-5xl font-black ${scoreColor(currentGrading.score)}`}>
                  {currentGrading.score}
                </span>
              </div>
              <div className="text-slate-400 text-sm mb-2">điểm / 100</div>
              <div className={`font-black text-xl ${
                currentGrading.status === 'correct' ? 'text-emerald-400'
                : currentGrading.status === 'partial' ? 'text-amber-400'
                : 'text-red-400'
              }`}>
                {currentGrading.status === 'correct' ? '🎉 Xuất Sắc!'
                  : currentGrading.status === 'partial' ? '⚡ Gần Đúng!'
                  : '💪 Cố Gắng Hơn!'}
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 mb-6 border border-slate-700">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Nhận xét của AI:</p>
              <p className="text-slate-200 text-sm leading-relaxed">{currentGrading.feedback}</p>
            </div>

            <button
              onClick={() => goToNextQuestion([...gradings])}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-95 text-base"
            >
              {currentIndex + 1 >= totalQuestions
                ? '🏁 Xem Kết Quả Tổng'
                : `Câu ${currentIndex + 2} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
