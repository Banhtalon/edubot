import React from 'react';

export default function ProgressDashboard({ history = [] }) {
    // Lọc ra các bài làm có chấm điểm (score != null)
    const gradedAttempts = history
        .filter(item => item.gradingResult && typeof item.gradingResult.score === 'number')
        .map(item => ({
            id: item.id,
            title: item.title || 'Bài tập không tên',
            score: item.gradingResult.score,
            status: item.gradingResult.status,
            language: item.language || 'python',
            date: new Date(item.id).toLocaleDateString('vi-VN')
        }))
        .reverse(); // Đảo thứ tự để hiển thị bài cũ nhất đến mới nhất trong biểu đồ

    const totalSolved = history.length;
    const totalGraded = gradedAttempts.length;
    const averageScore = totalGraded > 0
        ? Math.round(gradedAttempts.reduce((acc, curr) => acc + curr.score, 0) / totalGraded)
        : 0;

    const highestScore = totalGraded > 0
        ? Math.max(...gradedAttempts.map(item => item.score))
        : 0;

    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                    </svg>
                </span>
                Tiến độ học tập
            </h2>

            {/* Các thông số chính */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalSolved}</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Đã giải</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{averageScore}đ</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Trung bình</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400">{highestScore}đ</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Cao nhất</div>
                </div>
            </div>

            {/* Biểu đồ chấm điểm trực quan (CSS columns) */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3.5 tracking-wider">
                    Điểm số bài tập gần đây
                </h3>
                {totalGraded === 0 ? (
                    <div className="h-[120px] bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/50 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <span>Chưa có bài làm được chấm điểm</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Biểu đồ cột */}
                        <div className="h-[120px] flex items-end justify-around gap-2 px-2 pt-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                            {gradedAttempts.slice(-6).map((item, idx) => {
                                const heightPercent = `${Math.max(10, item.score)}%`;
                                const barColor = item.score >= 80
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : item.score >= 50
                                    ? 'bg-amber-500 hover:bg-amber-600'
                                    : 'bg-red-500 hover:bg-red-600';
                                
                                return (
                                    <div key={item.id} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                        {/* Điểm hiển thị trên đỉnh cột */}
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            {item.score}
                                        </span>
                                        {/* Cột điểm */}
                                        <div
                                            style={{ height: heightPercent }}
                                            className={`w-full rounded-t-md transition-all duration-300 ${barColor} cursor-pointer`}
                                        ></div>
                                        {/* Tooltip khi hover */}
                                        <div className="absolute bottom-full mb-6 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                            <div className="bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-md whitespace-nowrap leading-tight">
                                                <div className="font-bold">{item.title}</div>
                                                <div>Điểm: {item.score}/100 ({item.language})</div>
                                                <div className="opacity-70 text-[9px]">{item.date}</div>
                                            </div>
                                            <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Chú thích ngôn ngữ */}
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-1">
                            <span>Bài cũ nhất</span>
                            <span className="italic">Hiển thị tối đa 6 bài gần đây</span>
                            <span>Mới nhất</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
