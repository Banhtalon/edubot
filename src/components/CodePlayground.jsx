import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';

export default function CodePlayground({
    language,
    userCode,
    onCodeChange,
    onExportCode,
    onCheckCode,
    isCheckingCode,
    gradingResult,
    onSimulateRun
}) {
    const [terminalLogs, setTerminalLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const terminalEndRef = useRef(null);

    // Xóa logs khi chuyển ngôn ngữ
    useEffect(() => {
        setTerminalLogs([]);
    }, [language]);

    // Tự động cuộn xuống cuối terminal
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [terminalLogs]);

    // Kết xuất Scratch Visual Blocks khi code Scratch thay đổi
    useEffect(() => {
        if (language === 'scratch') {
            const timer = setTimeout(() => {
                if (window.scratchblocks) {
                    try {
                        const previewEl = document.getElementById('scratchblocks-preview');
                        if (previewEl) {
                            previewEl.innerHTML = `<pre class="scratchblocks">${userCode}</pre>`;
                            window.scratchblocks.renderMatching('#scratchblocks-preview .scratchblocks', {
                                style: 'scratch3',
                                languages: ['en', 'vi']
                            });
                        }
                    } catch (e) {
                        console.error("Lỗi vẽ Scratchblocks:", e);
                    }
                }
            }, 500); // Debounce 500ms
            return () => clearTimeout(timer);
        }
    }, [userCode, language]);

    const appendLog = (text, type = 'output') => {
        setTerminalLogs(prev => [...prev, { text, type, timestamp: new Date().toLocaleTimeString() }]);
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setTerminalLogs([]);
        appendLog(`Bắt đầu chạy mã ${language.toUpperCase()}...`, 'info');

        if (language === 'python') {
            // Chạy bằng Pyodide thực tế ở máy khách
            if (typeof window.loadPyodide === 'undefined') {
                appendLog("Lỗi: Không tìm thấy thư viện Pyodide. Vui lòng kiểm tra kết nối mạng.", 'error');
                setIsRunning(false);
                return;
            }

            appendLog("Đang tải môi trường Python (Pyodide WebAssembly)...", 'info');
            try {
                if (!window.pyodideInstance) {
                    window.pyodideInstance = await window.loadPyodide();
                }
                const pyodide = window.pyodideInstance;
                
                let outputStr = "";
                pyodide.setStdout({
                    batched: (text) => {
                        outputStr += text + "\n";
                    }
                });
                pyodide.setStderr({
                    batched: (text) => {
                        outputStr += text + "\n";
                    }
                });

                await pyodide.runPythonAsync(userCode);
                
                setIsRunning(false);
                if (outputStr.trim()) {
                    appendLog(outputStr, 'output');
                } else {
                    appendLog("Mã nguồn chạy thành công nhưng không có kết quả in ra màn hình console.", 'success');
                }
            } catch (err) {
                setIsRunning(false);
                appendLog(err.message, 'error');
            }
        } else {
            // Chạy bằng AI giả lập (C++, Scratch, GameMaker)
            try {
                appendLog("Đang gửi mã nguồn lên Gemini AI để giả lập môi trường chạy thử...", 'info');
                const simulationResult = await onSimulateRun(userCode, language);
                setIsRunning(false);
                
                if (simulationResult.error) {
                    appendLog(simulationResult.error, 'error');
                } else {
                    appendLog(simulationResult.output, 'output');
                    if (simulationResult.notes) {
                        appendLog(`[Chú thích AI]: ${simulationResult.notes}`, 'info');
                    }
                }
            } catch (err) {
                setIsRunning(false);
                appendLog("Gặp lỗi khi giả lập chạy code: " + err.message, 'error');
            }
        }
    };

    // Xác định cấu hình CodeMirror dựa trên ngôn ngữ chọn
    const getExtensions = () => {
        switch (language) {
            case 'python': return [python()];
            case 'cpp': return [cpp()];
            case 'gamemaker': return [javascript()]; // GML cú pháp tựa JavaScript/C++
            default: return []; // Scratch gõ text thuần
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>💻</span> Luyện Tập Lập Trình ({language.toUpperCase()})
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Viết mã nguồn giải bài, chạy thử trực tuyến và chấm bài bằng trí tuệ nhân tạo.
                    </p>
                </div>
                <div className="flex gap-2.5 w-full md:w-auto">
                    <button
                        onClick={onExportCode}
                        className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm border border-indigo-100/50 dark:border-indigo-900/30 cursor-pointer"
                    >
                        📥 Tải tệp tin
                    </button>
                    <button
                        onClick={handleRunCode}
                        disabled={isRunning}
                        className="px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm border border-emerald-100/50 dark:border-emerald-900/30 disabled:opacity-50 cursor-pointer"
                    >
                        {isRunning ? (
                            <><div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> Đang chạy...</>
                        ) : "▶ Chạy Thử"}
                    </button>
                </div>
            </div>

            {/* Layout Soạn Thảo (Với Scratch, chia làm 2 cột: Code & Visual Blocks Preview) */}
            <div className={`grid gap-4 ${language === 'scratch' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Khu vực CodeMirror Editor */}
                <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    {language === 'scratch' ? (
                        // Với Scratchblocks, có thể dùng CodeMirror chế độ Text thuần hoặc Textarea
                        <CodeMirror
                            value={userCode}
                            height="350px"
                            theme="dark"
                            onChange={(value) => onCodeChange(value)}
                            placeholder="// Nhập cú pháp Scratchblocks tại đây...&#10;// Ví dụ:&#10;// khi lá cờ xanh được click&#10;// nói [Chào bạn!] trong (2) giây"
                            className="text-sm font-mono leading-relaxed"
                        />
                    ) : (
                        <CodeMirror
                            value={userCode}
                            height="350px"
                            theme="dark"
                            extensions={getExtensions()}
                            onChange={(value) => onCodeChange(value)}
                            className="text-sm font-mono leading-relaxed"
                        />
                    )}
                </div>

                {/* Khung xem trước Scratchblocks (Chỉ hiển thị khi chọn Scratch) */}
                {language === 'scratch' && (
                    <div className="flex flex-col h-[352px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center gap-1.5 select-none">
                            <span>🐱</span> Xem trước khối lập trình trực quan (Visual Blocks)
                        </div>
                        <div 
                            id="scratchblocks-preview"
                            className="flex-1 p-4 bg-slate-100/50 dark:bg-slate-950/20 overflow-auto custom-scrollbar flex items-start justify-start"
                        >
                            <pre className="scratchblocks text-slate-400 text-xs">Loading visual blocks...</pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Khung Terminal Console kết quả chạy code */}
            {(terminalLogs.length > 0 || isRunning) && (
                <div className="bg-[#1e1e1e] rounded-xl border border-slate-700/60 p-4 font-mono text-xs md:text-sm text-slate-300 shadow-md">
                    <div className="flex justify-between items-center border-b border-slate-700/80 pb-2 mb-2 text-slate-500 font-bold select-none text-[10px] uppercase tracking-wider">
                        <span>Console Terminal Output</span>
                        <button 
                            onClick={() => setTerminalLogs([])}
                            className="text-[9px] hover:text-slate-300 transition-colors"
                        >
                            [Xóa log]
                        </button>
                    </div>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                        {terminalLogs.map((log, idx) => {
                            let typeClass = 'text-slate-300';
                            if (log.type === 'info') typeClass = 'text-blue-400';
                            if (log.type === 'error') typeClass = 'text-red-400 font-bold';
                            if (log.type === 'success') typeClass = 'text-emerald-400';
                            
                            return (
                                <div key={idx} className="whitespace-pre-wrap break-all flex items-start gap-2">
                                    <span className="text-[10px] text-slate-600 select-none">[{log.timestamp}]</span>
                                    <span className={typeClass}>{log.text}</span>
                                </div>
                            );
                        })}
                        <div ref={terminalEndRef} />
                    </div>
                </div>
            )}

            {/* Nút gửi chấm bài */}
            <div className="flex justify-between items-center gap-4">
                <div className="text-xs text-slate-400 dark:text-slate-500 italic max-w-[60%]">
                    Lưu ý: Viết mã nguồn giải bài (điền dưới mỗi dòng chú thích), sau đó nhấn "Kiểm Tra Bài Làm" để nhận đánh giá từ giáo viên AI.
                </div>
                <button
                    onClick={onCheckCode}
                    disabled={isCheckingCode}
                    className="px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95 duration-150"
                >
                    {isCheckingCode ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang chấm bài...</>
                    ) : (
                        <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Kiểm Tra Bài Làm</>
                    )}
                </button>
            </div>

            {/* Bảng kết quả chấm bài */}
            {gradingResult && (
                <div className={`p-6 rounded-2xl border animate-fade-in ${
                    gradingResult.status === "correct" ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-350" :
                    gradingResult.status === "partial" ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-250 dark:border-amber-800/50 text-amber-800 dark:text-amber-350" :
                    "bg-red-50/50 dark:bg-red-950/10 border-red-250 dark:border-red-800/50 text-red-800 dark:text-red-350"
                }`}>
                    <div className="flex justify-between items-center mb-4 border-b border-current/10 pb-3">
                        <h4 className="font-extrabold text-lg flex items-center gap-2">
                            {gradingResult.status === "correct" ? "🎉 Kết quả: CHÍNH XÁC" :
                             gradingResult.status === "partial" ? "💡 Kết quả: ĐÚNG MỘT PHẦN" :
                             "❌ Kết quả: CHƯA CHÍNH XÁC"}
                        </h4>
                        <span className="text-xl font-black px-3.5 py-1 bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-slate-800 dark:text-white">
                            {gradingResult.score}/100đ
                        </span>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide opacity-80 mb-1">Nhận xét chi tiết:</h5>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{gradingResult.feedback}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
