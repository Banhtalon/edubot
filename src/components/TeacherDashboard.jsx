import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth, saveExam, getExams, setExamActive, subscribeToExamResults } from '../firebase';

// ──── Gemini API ─ phân tích ảnh đề thi ────────────────────────────────
async function analyzeExamFiles(files, apiKey) {
  const systemInstruction = `Bạn là AI phân tích đề thi lập trình Python cho học sinh.
Đọc nội dung đề thi (ảnh hoặc PDF) và trả về JSON với cấu trúc:
{
  "examTitle": "Tên đề thi ngắn gọn",
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Nội dung câu hỏi đầy đủ (giữ nguyên nội dung đề)",
      "hints": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."],
      "sampleSolution": "# Code Python mẫu đầy đủ với comments tiếng Việt"
    }
  ]
}
Yêu cầu:
- Nhận diện đúng số câu hỏi trong đề (thường 1-10 câu)
- hints: 3-5 bước gợi ý ngắn gọn giúp học sinh suy nghĩ thuật toán
- sampleSolution: Code Python chuẩn, có comments giải thích mỗi dòng
Chỉ trả về JSON thô, không dùng markdown.`;

  const inlineDataParts = files.map(f => ({
    inlineData: { mimeType: f.type, data: f.base64.split(',')[1] }
  }));

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Phân tích đề thi Python trong các tệp này và trả về danh sách câu hỏi theo định dạng JSON yêu cầu.' },
          ...inlineDataParts
        ],
      },
    ],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          examTitle: { type: 'STRING' },
          questions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                questionNumber: { type: 'INTEGER' },
                questionText: { type: 'STRING' },
                hints: { type: 'ARRAY', items: { type: 'STRING' } },
                sampleSolution: { type: 'STRING' },
              },
              required: ['questionNumber', 'questionText', 'hints', 'sampleSolution'],
            },
          },
        },
        required: ['examTitle', 'questions'],
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
  if (!text) throw new Error('Không nhận được phản hồi từ AI.');
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
}

// ──── Gemini API ─ Tổng hợp lỗi sai lớp học ────────────────────────────────
async function analyzeClassInsights(results, apiKey) {
  const feedbacks = results.filter(r => r.status === 'completed').map(r => {
    return `Học sinh: ${r.studentName}\n` + (r.questionDetails || []).map(q => `- Câu ${q.questionNumber} (Điểm ${q.score}): ${q.feedback}`).join('\n');
  }).join('\n\n');

  if (!feedbacks) return "Chưa có đủ dữ liệu để phân tích.";

  const payload = {
    contents: [{ role: 'user', parts: [{ text: `Dưới đây là nhận xét chấm bài của các học sinh trong lớp:\n\n${feedbacks}\n\nHãy tổng hợp lại các lỗi sai phổ biến nhất và đưa ra gợi ý sư phạm cho giáo viên.` }] }],
    systemInstruction: { parts: [{ text: `Bạn là chuyên gia sư phạm. Phân tích nhận xét chấm bài và viết một báo cáo ngắn gọn (150-200 từ) tóm tắt: 1. Lỗi phổ biến nhất học sinh hay mắc phải. 2. Khái niệm nào học sinh chưa hiểu rõ. 3. Gợi ý bài giảng tiếp theo cho giáo viên.` }] },
    generationConfig: { responseMimeType: 'text/plain' },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  if (!res.ok) throw new Error(`Gemini API lỗi: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có báo cáo.";
}

// ──── Tab: Quản lý đề thi ────────────────────────────────────────────────
function ExamManager({ apiKey, onApiKeySave, showToast }) {
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedExam, setParsedExam] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  
  // Extra settings
  const [examDuration, setExamDuration] = useState(15); // mặc định 15 phút
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    loadExams();
  }, []);

  // Paste file (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      if (!showUpload) return;
      const items = Array.from(e.clipboardData?.items || []);
      const fileItems = items.filter((i) => i.type.startsWith('image/') || i.type === 'application/pdf');
      if (fileItems.length > 0) {
        const files = fileItems.map(i => i.getAsFile());
        readFiles(files);
        e.preventDefault();
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showUpload]);

  const readFiles = (files) => {
    if (!files) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (validFiles.length === 0) return;

    Promise.all(validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            base64: reader.result
          });
        };
        reader.readAsDataURL(file);
      });
    })).then(results => {
      setUploadedFiles(prev => [...prev, ...results]);
      setParsedExam(null);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    readFiles(e.dataTransfer.files);
  };

  const loadExams = async () => {
    setLoadingExams(true);
    try {
      const data = await getExams();
      setExams(data);
    } catch (e) {
      showToast('Lỗi tải danh sách đề thi: ' + e.message, 'error');
    } finally {
      setLoadingExams(false);
    }
  };

  const handleAnalyze = async () => {
    if (uploadedFiles.length === 0) { showToast('Vui lòng chọn ít nhất 1 tệp đề thi!', 'error'); return; }
    const key = tempApiKey.trim();
    if (!key) { showToast('Vui lòng nhập Gemini API Key!', 'error'); return; }
    onApiKeySave(key);
    setIsAnalyzing(true);
    setParsedExam(null);
    try {
      const result = await analyzeExamFiles(uploadedFiles, key);
      setParsedExam(result);
      showToast(`Đã phân tích xong: ${result.questions.length} câu hỏi!`);
    } catch (e) {
      showToast('Lỗi phân tích: ' + e.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveExam = async () => {
    if (!parsedExam) return;
    setIsSaving(true);
    try {
      await saveExam({
        title: parsedExam.examTitle,
        questions: parsedExam.questions,
        duration: examDuration,
        leaderboardEnabled: leaderboardEnabled
      });
      showToast('Đã lưu đề thi vào database!');
      setParsedExam(null);
      setUploadedFiles([]);
      setShowUpload(false);
      await loadExams();
    } catch (e) {
      showToast('Lỗi lưu đề thi: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (exam) => {
    try {
      // Tắt tất cả đề khác trước khi bật đề này
      if (!exam.isActive) {
        await Promise.all(exams.filter((e) => e.isActive && e.id !== exam.id).map((e) => setExamActive(e.id, false)));
      }
      await setExamActive(exam.id, !exam.isActive);
      showToast(exam.isActive ? 'Đã tắt đề thi.' : 'Đã kích hoạt đề thi cho học sinh!');
      await loadExams();
    } catch (e) {
      showToast('Lỗi cập nhật: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Gemini API Key
        </h3>
        <div className="flex gap-3">
          <input
            type="password"
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            placeholder="Nhập Gemini API Key..."
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => { onApiKeySave(tempApiKey.trim()); showToast('Đã lưu API Key!'); }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            Lưu
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-2">
          Lấy miễn phí tại{' '}
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
            aistudio.google.com
          </a>
        </p>
      </div>

      {/* Upload button */}
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">📋 Danh Sách Đề Thi</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload Đề Mới
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5 animate-fade-in">
          <h4 className="text-slate-200 font-bold flex items-center gap-2">
            📤 Upload & Phân Tích Đề Thi
          </h4>

          {/* Drop zone */}
          <div
            ref={dropZoneRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => uploadedFiles.length === 0 && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition cursor-pointer relative overflow-hidden ${
              uploadedFiles.length > 0 ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-700/30'
            }`}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={(e) => readFiles(e.target.files)}
              className="hidden"
            />
            {uploadedFiles.length > 0 ? (
              <div className="p-4 w-full h-full flex flex-col justify-center">
                <div className="flex flex-wrap gap-4 justify-center items-center">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="relative group w-24 h-32 flex flex-col items-center justify-center bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
                      {file.type.startsWith('image/') ? (
                        <img src={file.base64} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2 flex flex-col items-center justify-center h-full w-full bg-slate-900">
                          <div className="text-3xl mb-1 text-red-500">📄</div>
                          <div className="text-[10px] text-slate-400 truncate w-full px-1">{file.name || 'PDF'}</div>
                        </div>
                      )}
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                          setParsedExam(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-lg z-10 cursor-pointer hover:bg-red-600"
                        title="Xóa tệp này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="w-24 h-32 border-2 border-dashed border-slate-500 rounded-xl flex flex-col items-center justify-center hover:bg-slate-700/50 transition text-slate-400 hover:text-white cursor-pointer hover:border-indigo-500"
                  >
                    <span className="text-2xl mb-1">+</span>
                    <span className="text-xs font-semibold">Thêm tệp</span>
                  </button>
                </div>
                <div className="mt-5 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedFiles([]); setParsedExam(null); }}
                    className="text-red-400 text-sm font-semibold hover:text-red-300 hover:underline cursor-pointer px-4 py-1 rounded-full hover:bg-red-950/30 transition"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="text-4xl mb-3 flex justify-center gap-2">🖼️ <span className="opacity-70">📄</span></div>
                <p className="text-slate-300 font-semibold">Nhấp để chọn ảnh / PDF</p>
                <p className="text-slate-500 text-sm mt-1">hoặc kéo thả / dán tệp (<kbd className="bg-slate-700 px-1 rounded text-xs">Ctrl+V</kbd>)</p>
              </div>
            )}
          </div>

          {/* Analyze button */}
          {uploadedFiles.length > 0 && !parsedExam && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang phân tích AI...</>
              ) : '🔍 Phân Tích Đề Thi'}
            </button>
          )}

          {/* Parsed preview & Settings */}
          {parsedExam && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h5 className="text-emerald-400 font-bold flex items-center gap-2">
                  ✅ Đã phân tích: <span className="text-white">{parsedExam.examTitle}</span>
                </h5>
                <span className="bg-indigo-600/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/40">
                  {parsedExam.questions.length} câu hỏi
                </span>
              </div>

              {/* Settings before save */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
                <h6 className="text-white font-semibold text-sm">Cấu hình Đề thi</h6>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-slate-400 text-xs font-bold mb-1.5 uppercase">Thời gian làm bài (Phút)</label>
                    <input
                      type="number"
                      value={examDuration}
                      onChange={(e) => setExamDuration(Number(e.target.value))}
                      min={1}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-400 text-xs font-bold mb-1.5 uppercase">Bảng Xếp Hạng Cuối Giờ</label>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={leaderboardEnabled}
                        onChange={(e) => setLeaderboardEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                      />
                      <span className="text-slate-300 text-sm">Hiển thị cho học sinh</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setParsedExam(null); setUploadedFiles([]); }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition cursor-pointer text-sm"
                >
                  Phân Tích Lại
                </button>
                <button
                  onClick={handleSaveExam}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition disabled:opacity-60 cursor-pointer text-sm"
                >
                  {isSaving ? 'Đang lưu...' : '💾 Lưu Đề Thi'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exams list */}
      {loadingExams ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">📂</div>
          <p>Chưa có đề thi nào. Hãy upload đề đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className={`flex items-center justify-between p-5 rounded-2xl border transition ${
                exam.isActive
                  ? 'bg-indigo-950/40 border-indigo-600/60'
                  : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  {exam.isActive && (
                    <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                      🟢 ĐANG MỞ
                    </span>
                  )}
                  <h4 className="text-white font-semibold truncate">{exam.title}</h4>
                </div>
                <p className="text-slate-400 text-xs">
                  {exam.questions?.length || 0} câu hỏi · {exam.duration} phút ·{' '}
                  {exam.leaderboardEnabled ? 'Có BXH' : 'Không BXH'} ·{' '}
                  {exam.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || 'Vừa tạo'}
                </p>
              </div>
              <button
                onClick={() => handleToggleActive(exam)}
                className={`ml-4 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer flex-shrink-0 ${
                  exam.isActive
                    ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70 border border-red-800/50'
                    : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/70 border border-emerald-800/50'
                }`}
              >
                {exam.isActive ? 'Tắt đề' : 'Mở đề'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──── Tab: Giám sát kết quả & Live Monitor ────────────────────────────────
function ResultsViewer({ exams, apiKey, showToast }) {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classInsight, setClassInsight] = useState('');

  useEffect(() => {
    if (!selectedExamId) {
      setResults([]);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToExamResults(selectedExamId, (data) => {
      setResults(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedExamId]);

  const handleAnalyzeInsights = async () => {
    if (!apiKey) { showToast('Vui lòng lưu cấu hình Gemini API Key trước!', 'error'); return; }
    if (completedResults.length === 0) { showToast('Chưa có học sinh nào hoàn thành bài để phân tích!', 'error'); return; }
    
    setIsAnalyzing(true);
    try {
      const insight = await analyzeClassInsights(results, apiKey);
      setClassInsight(insight);
      showToast('Phân tích lớp học thành công!');
    } catch (e) {
      showToast('Lỗi phân tích: ' + e.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) { showToast('Không có dữ liệu để xuất!', 'error'); return; }
    const header = ['STT', 'Họ tên', 'Lớp', 'Trạng thái', 'Số lần gian lận', 'Điểm tổng', 'Thời gian nộp'];
    const rows = results.map((r, i) => [
      i + 1,
      `"${r.studentName}"`,
      `"${r.className}"`,
      r.status === 'completed' ? 'Đã nộp' : 'Đang thi',
      r.cheatCount,
      r.status === 'completed' ? r.totalScore : '',
      `"${r.submittedAt?.toDate?.()?.toLocaleString('vi-VN') || ''}"`
    ]);
    const csvContent = '\uFEFF' + [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const activeExamName = exams.find(e => e.id === selectedExamId)?.title || 'Exam';
    link.setAttribute('download', `BangDiem_${activeExamName.replace(/\\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống bảng điểm!');
  };

  const completedResults = results.filter(r => r.status === 'completed');
  const doingResults = results.filter(r => r.status === 'doing');

  const avg = completedResults.length > 0
    ? Math.round(completedResults.reduce((s, r) => s + (r.totalScore || 0), 0) / completedResults.length)
    : 0;

  const scoreColor = (s) =>
    s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Exam selector */}
      <div>
        <label className="block text-slate-300 text-sm font-semibold mb-2">Chọn đề thi để giám sát kết quả:</label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">-- Chọn đề thi --</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} {e.isActive ? '(đang mở)' : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : selectedExamId && results.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-3">📭</div>
          <p>Chưa có học sinh nào tham gia đề này.</p>
        </div>
      ) : results.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mb-2">
            <button
              onClick={handleAnalyzeInsights}
              disabled={isAnalyzing || completedResults.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isAnalyzing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Phân tích...</>
              ) : '🧠 Phân Tích Lớp Học'}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              📥 Xuất CSV
            </button>
          </div>

          {/* AI Insight Report */}
          {classInsight && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 mb-4 relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🧠</div>
              <h4 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                <span>✨</span> Báo cáo Sư phạm từ AI
              </h4>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap relative z-10">
                {classInsight}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Đang thi', value: doingResults.length, icon: '👨‍💻' },
              { label: 'Đã nộp bài', value: completedResults.length, icon: '✅' },
              { label: 'Điểm trung bình', value: avg, icon: '📊' },
              { label: 'Cảnh báo gian lận', value: results.filter(r => r.cheatCount > 0).length, icon: '⚠️' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-slate-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Results table */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">Họ tên</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">Lớp</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Trạng thái</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Gian lận</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.id} className={`border-b border-slate-800 hover:bg-slate-800/30 transition ${r.status === 'doing' ? 'bg-indigo-950/20' : ''}`}>
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-semibold">
                      {r.studentName}
                      {r.status === 'doing' && <span className="ml-2 w-2 h-2 inline-block bg-amber-500 rounded-full animate-pulse"></span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.className}</td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'doing' ? (
                        <span className="text-amber-400 text-xs font-bold px-2 py-1 bg-amber-950/40 rounded-full border border-amber-800/50">
                          Đang thi...
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-950/40 rounded-full border border-emerald-800/50">
                          Đã nộp
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.cheatCount > 0 ? (
                        <span className="text-red-400 text-xs font-bold px-2 py-1 bg-red-950/40 rounded-full border border-red-800/50">
                          ⚠️ {r.cheatCount} lần
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'completed' ? (
                        <span className={`font-black text-lg ${scoreColor(r.totalScore)}`}>{r.totalScore}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──── Main TeacherDashboard ──────────────────────────────────────────────
export default function TeacherDashboard({ user, apiKey, onApiKeySave, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('exams');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    getExams().then(setExams).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    showToast('Đã đăng xuất.');
    onLogout();
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950">
      {/* Dashboard header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-black text-lg leading-none">Bảng Điều Khiển Giáo Viên</h1>
              <p className="text-slate-500 text-xs mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 mb-8 w-fit">
          {[
            { id: 'exams', icon: '📋', label: 'Quản Lý Đề Thi' },
            { id: 'results', icon: '📡', label: 'Live Monitor' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pb-12">
          {activeTab === 'exams' && (
            <ExamManager
              apiKey={apiKey}
              onApiKeySave={onApiKeySave}
              showToast={showToast}
            />
          )}
          {activeTab === 'results' && (
            <ResultsViewer exams={exams} apiKey={apiKey} showToast={showToast} />
          )}
        </div>
      </div>
    </div>
  );
}
