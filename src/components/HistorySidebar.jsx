import React from 'react';

export default function HistorySidebar({ history = [], activeItemId, onItemSelect, onItemDelete }) {
    if (history.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center py-8">
                <span className="text-3xl opacity-40 block mb-2">📚</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Lịch sử trống</h3>
                <p className="text-xs text-slate-400 mt-1">Các bài tập đã giải sẽ xuất hiện tại đây.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
            <h2 className="font-bold text-lg mb-4 flex items-center justify-between text-slate-800 dark:text-white">
                <span className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </span>
                    Bài tập đã giải
                </span>
                <span className="text-xs bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full font-bold text-slate-500">
                    {history.length} bài
                </span>
            </h2>

            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {history.map((item) => {
                    const isActive = activeItemId === item.id;
                    const formattedDate = new Date(item.id).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    // Icon ngôn ngữ
                    const langIcons = {
                        python: '🐍',
                        cpp: '⚙️',
                        scratch: '🐱',
                        gamemaker: '🎮'
                    };

                    return (
                        <div
                            key={item.id}
                            className={`group p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 relative ${
                                isActive
                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-150 dark:border-slate-850/60'
                            }`}
                        >
                            {/* Ảnh thu nhỏ preview */}
                            <div 
                                onClick={() => onItemSelect(item)} 
                                className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700/50"
                            >
                                {item.imagePreview ? (
                                    <img src={item.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs opacity-50">🖼️</div>
                                )}
                            </div>

                            {/* Thông tin bài tập */}
                            <div 
                                onClick={() => onItemSelect(item)} 
                                className="flex-1 min-w-0 cursor-pointer"
                            >
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-4">
                                    {item.title || 'Đề bài tập'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-semibold">
                                    <span>{langIcons[item.language] || '💻'} {item.language.toUpperCase()}</span>
                                    <span>•</span>
                                    <span>{formattedDate}</span>
                                </div>
                                {item.gradingResult && (
                                    <span className="inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                                        Điểm: {item.gradingResult.score}đ
                                    </span>
                                )}
                            </div>

                            {/* Nút Xóa bài tập khỏi lịch sử */}
                            <button
                                onClick={() => onItemDelete(item.id)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors duration-150 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                title="Xóa lịch sử"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
