import React from 'react';

const LANGUAGES = [
    { id: 'python', name: 'Python', icon: '🐍', color: 'from-blue-500 to-yellow-500' },
    { id: 'cpp', name: 'C++', icon: '⚙️', color: 'from-blue-600 to-indigo-600' },
    { id: 'scratch', name: 'Scratch', icon: '🐱', color: 'from-orange-500 to-amber-500' },
    { id: 'gamemaker', name: 'GameMaker (GML)', icon: '🎮', color: 'from-emerald-500 to-teal-500' }
];

export default function LanguageSelector({ selectedLanguage, onLanguageChange }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
            <h2 className="font-bold text-lg mb-3.5 flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                </span>
                Ngôn ngữ học tập
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Chọn ngôn ngữ bạn muốn lập trình giải bài tập. AI sẽ cung cấp đáp án và chấm điểm dựa trên ngôn ngữ này.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
                {LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguage === lang.id;
                    return (
                        <button
                            key={lang.id}
                            onClick={() => onLanguageChange(lang.id)}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer group text-center ${
                                isSelected
                                    ? `bg-gradient-to-r ${lang.color} text-white border-transparent shadow-md shadow-indigo-500/10`
                                    : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <span className={`text-2xl transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                {lang.icon}
                            </span>
                            <span className="text-xs font-bold font-sans tracking-wide">
                                {lang.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
