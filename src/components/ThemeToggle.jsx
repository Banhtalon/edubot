import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        // Kiểm tra xem đã lưu cấu hình theme chưa, nếu chưa dùng cấu hình hệ thống
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-200 active:scale-95 shadow-sm border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center cursor-pointer"
            aria-label="Toggle Theme"
        >
            {isDark ? (
                // Icon Mặt trời (cho chế độ sáng)
                <svg className="w-5 h-5 text-amber-500 animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
            ) : (
                // Icon Mặt trăng (cho chế độ tối)
                <svg className="w-5 h-5 text-indigo-500 animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
}
