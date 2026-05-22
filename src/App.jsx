import React, { useState, useRef, useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';
import LanguageSelector from './components/LanguageSelector';
import HistorySidebar from './components/HistorySidebar';
import ProgressDashboard from './components/ProgressDashboard';
import SolutionDetails from './components/SolutionDetails';
import CodePlayground from './components/CodePlayground';

export default function App() {
    const [userApiKey, setUserApiKey] = useState(localStorage.getItem("gemini_api_key") || "");
    const [tempApiKey, setTempApiKey] = useState(localStorage.getItem("gemini_api_key") || "");
    const [showApiKey, setShowApiKey] = useState(false);
    const apiKeyInputRef = useRef(null);

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [requirements, setRequirements] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [apiStatus, setApiStatus] = useState("ready");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const fileInputRef = useRef(null);

    // Trạng thái ngôn ngữ chọn (mặc định python)
    const [language, setLanguage] = useState('python');

    // Trạng thái tab hiển thị lời giải ('practice' - luyện tập, 'solution' - đáp án)
    const [activeTab, setActiveTab] = useState('practice');

    // Trạng thái lịch sử lưu localStorage
    const [history, setHistory] = useState(() => {
        try {
            const savedHistory = localStorage.getItem("homework_history");
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (e) {
            console.error("Lỗi đọc lịch sử:", e);
            return [];
        }
    });

    const [activeItemId, setActiveItemId] = useState(null);
    const [userCode, setUserCode] = useState("# Viết mã Python của bạn tại đây\n\n");
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [gradingResult, setGradingResult] = useState(null);

    // Lưu API Key
    const handleSaveApiKey = () => {
        const trimmedKey = tempApiKey.trim();
        if (!trimmedKey) {
            showToast("Vui lòng nhập API Key trước khi lưu!", "error");
            return;
        }
        localStorage.setItem("gemini_api_key", trimmedKey);
        setUserApiKey(trimmedKey);
        showToast("Đã lưu Gemini API Key thành công!");
    };

    // Xóa API Key
    const handleDeleteApiKey = () => {
        localStorage.removeItem("gemini_api_key");
        setUserApiKey("");
        setTempApiKey("");
        showToast("Đã xóa Gemini API Key.", "error");
    };

    // Hiển thị thông báo Toast
    const showToast = (message, type = "success") => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((item) => item.id !== id));
        }, 4000);
    };

    // Lựa chọn bài tập cũ từ Lịch sử
    const handleSelectHistoryItem = (item) => {
        setActiveItemId(item.id);
        setImagePreview(item.imagePreview);
        setLanguage(item.language);
        setAnalysisResult(item.analysisResult);
        setUserCode(item.userCode);
        setGradingResult(item.gradingResult);
        setActiveTab('practice');
        showToast(`Đã tải lại bài tập: ${item.title || 'Không tên'}`);
    };

    // Xóa một bài tập trong Lịch sử
    const handleDeleteHistoryItem = (itemId) => {
        const updatedHistory = history.filter(item => item.id !== itemId);
        setHistory(updatedHistory);
        localStorage.setItem("homework_history", JSON.stringify(updatedHistory));
        
        if (activeItemId === itemId) {
            handleReset();
        }
        showToast("Đã xóa bài tập khỏi lịch sử.", "error");
    };

    // Tải xuống file code (.py, .cpp, .txt, .gml)
    const handleExportCode = () => {
        if (!userCode.trim()) {
            showToast("Không có mã nguồn để tải!", "error");
            return;
        }

        const extensions = {
            python: 'py',
            cpp: 'cpp',
            scratch: 'txt',
            gamemaker: 'gml'
        };
        const ext = extensions[language] || 'txt';
        const blob = new Blob([userCode], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bai_lam.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Đã tải xuống tệp bai_lam.${ext} thành công!`);
    };

    // Chạy giả lập qua Gemini AI (C++, Scratch, GameMaker)
    const handleSimulateRun = async (code, lang) => {
        if (!userApiKey) {
            throw new Error("Vui lòng cấu hình API Key để chạy giả lập AI.");
        }

        const langNames = {
            cpp: "C++",
            scratch: "Scratch (Visual Blocks)",
            gamemaker: "GameMaker Language (GML)"
        };

        const systemInstruction = `Bạn là một hệ thống runtime console giả lập chạy mã nguồn lập trình.
Nhiệm vụ của bạn là đọc đề bài bài tập (nếu có hình ảnh) và giả lập chạy đoạn mã học sinh viết cho ngôn ngữ ${langNames[lang] || lang}.
Hãy in ra kết quả chạy thử chính xác nhất (bao gồm cả kết quả in ra màn hình hoặc thông tin lỗi cú pháp/runtime chi tiết nếu học sinh làm sai) giống hệt như một terminal thật.
Đặc biệt lưu ý:
1. Đối với Scratch: Giả lập chạy từ khối bắt đầu (như "khi lá cờ xanh được click") và in ra các câu hội thoại "nói [văn bản]" hoặc kết quả tính toán dưới dạng log console.
2. Trả về định dạng JSON có 3 trường bắt buộc:
   - "output": Chuỗi log output của terminal khi chạy (phân dòng bằng \\n).
   - "notes": Ghi chú giải thích ngắn gọn bằng tiếng Việt tại sao lại có kết quả đó hoặc học sinh sai ở đâu (không quá 2 câu).
   - "error": Nếu có lỗi khiến code không chạy được, điền thông tin lỗi chi tiết ở đây (ngược lại điền chuỗi rỗng).

Lưu ý: Chỉ trả về chuỗi JSON thô, không bọc bởi \`\`\`json.`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `Đây là mã nguồn viết bằng ngôn ngữ ${lang} cần chạy giả lập:\n\n\`\`\`${lang}\n${code}\n\`\`\`` },
                        ...(imagePreview ? [{ inlineData: { mimeType: "image/png", data: imagePreview.split(',')[1] } }] : [])
                    ]
                }
            ],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        output: { type: "STRING" },
                        notes: { type: "STRING" },
                        error: { type: "STRING" }
                    },
                    required: ["output", "notes", "error"]
                }
            }
        };

        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${userApiKey}`;
        const response = await fetch(endpointUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            jsonText = jsonText.replace(/^```json/im, "").replace(/```$/m, "").trim();
            return JSON.parse(jsonText);
        }
        throw new Error("Không nhận được phản hồi từ AI.");
    };

    // Giáo viên AI chấm bài làm của học sinh
    const handleCheckCode = async () => {
        if (!userCode.trim()) {
            showToast("Vui lòng nhập mã nguồn trước khi kiểm tra!", "error");
            return;
        }
        if (!userApiKey) {
            showToast("Vui lòng điền Gemini API Key ở cột cấu hình để tiếp tục chấm bài!", "error");
            if (apiKeyInputRef.current) {
                apiKeyInputRef.current.focus();
                apiKeyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        setIsCheckingCode(true);
        setGradingResult(null);
        showToast("AI đang chấm bài của bạn, vui lòng đợi...");

        const langNames = {
            python: "Python 3",
            cpp: "C++",
            scratch: "Scratch blocks text",
            gamemaker: "GameMaker Language (GML)"
        };
        const selectedLangName = langNames[language];

        try {
            const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${userApiKey}`;
            
            const systemInstruction = `Bạn là một giáo viên dạy lập trình ${selectedLangName} nghiêm khắc nhưng tận tâm.
Nhiệm vụ của bạn là kiểm tra xem đoạn mã ${selectedLangName} của học sinh có giải quyết đúng bài tập trong hình ảnh và đúng yêu cầu của đề bài hay không.
Hãy so sánh mã của học sinh với lời giải chuẩn: ${analysisResult?.fullSolution || ""}.
Yêu cầu trả về định dạng JSON (bắt buộc có các trường sau):
1. "status": Trạng thái ("correct" - Đúng, "incorrect" - Sai, "partial" - Đúng một phần).
2. "score": Điểm số từ 0 đến 100 (số nguyên).
3. "feedback": Nhận xét chi tiết từng dòng hoặc các lỗi logic, lỗi cú pháp, cách cải tiến (viết bằng tiếng Việt).
4. "suggestedFix": Đoạn mã sửa đổi gợi ý nếu học sinh làm sai (đặt trong khối \`\`\`${language} ... \`\`\`).
 
Lưu ý: Chỉ trả về chuỗi JSON thô, không bọc bởi \`\`\`json.`;

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: `Đây là mã nguồn ${selectedLangName} học sinh tự viết:\n\n\`\`\`${language}\n${userCode}\n\`\`\`` },
                            ...(imagePreview ? [{ inlineData: { mimeType: "image/png", data: imagePreview.split(',')[1] } }] : [])
                        ]
                    }
                ],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            status: { type: "STRING" },
                            score: { type: "INTEGER" },
                            feedback: { type: "STRING" },
                            suggestedFix: { type: "STRING" }
                        },
                        required: ["status", "score", "feedback", "suggestedFix"]
                    }
                }
            };

            const response = await fetch(endpointUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (jsonText) {
                jsonText = jsonText.replace(/^```json/im, "").replace(/```$/m, "").trim();
                const parsedGrading = JSON.parse(jsonText);
                setGradingResult(parsedGrading);

                // Cập nhật kết quả chấm bài vào lịch sử
                if (activeItemId) {
                    const updatedHistory = history.map(item => {
                        if (item.id === activeItemId) {
                            return { ...item, userCode, gradingResult: parsedGrading };
                        }
                        return item;
                    });
                    setHistory(updatedHistory);
                    localStorage.setItem("homework_history", JSON.stringify(updatedHistory));
                }

                if (parsedGrading.status === "correct") {
                    showToast("Chúc mừng! Bài làm của bạn hoàn toàn chính xác. 🎉", "success");
                } else if (parsedGrading.status === "partial") {
                    showToast("Bài làm gần đúng, hãy xem nhận xét để cải thiện! 💡", "success");
                } else {
                    showToast("Bài làm chưa đúng, hãy xem hướng dẫn sửa đổi!", "error");
                }
            }
        } catch (err) {
            console.error("Lỗi chấm bài:", err);
            showToast("Lỗi chấm bài: " + err.message, "error");
        } finally {
            setIsCheckingCode(false);
        }
    };

    // Chuẩn bị nội dung gửi đi giải bài bằng Gemini
    const generateSolutionWithGemini = async (base64Image, customPrompt) => {
        if (!userApiKey) {
            showToast("Vui lòng điền Gemini API Key ở cột cấu hình để tiếp tục giải bài!", "error");
            if (apiKeyInputRef.current) {
                apiKeyInputRef.current.focus();
                apiKeyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            throw new Error("Missing Gemini API Key");
        }

        const langNames = {
            python: "Python 3",
            cpp: "C++",
            scratch: "Scratch 3.0 (viết dưới dạng văn bản scratchblocks bằng tiếng Việt, ví dụ:\n'khi lá cờ xanh được click\nnói [Chào bạn!] trong (2) giây')",
            gamemaker: "GameMaker Language (GML)"
        };
        const selectedLangName = langNames[language];

        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${userApiKey}`;
        
        const systemInstruction = `Bạn là một trợ lý giáo dục AI xuất sắc tại Việt Nam.
Nhiệm vụ của bạn là đọc hình ảnh bài tập lập trình được gửi lên, phân tích đề bài và trả về câu trả lời có cấu trúc JSON.
Ngôn ngữ lập trình học sinh đang học là: ${selectedLangName}.
Yêu cầu định dạng JSON (bắt buộc có 4 trường):
1. "keyConcepts": Tóm tắt kiến thức lý thuyết cần nắm vững liên quan đến bài tập.
2. "stepByStep": Hướng dẫn giải từng bước chi tiết (thuật toán). BẮT BUỘC NGẮT DÒNG RÕ RÀNG GIỮA CÁC BƯỚC. Viết rõ chữ "Bước 1:", "Bước 2:" ở đầu mỗi bước.
3. "fullSolution": Lời giải hoàn chỉnh bằng ngôn ngữ ${selectedLangName} (Code phải bọc trong \`\`\`${language}). ĐẶC BIỆT LƯU Ý: TRONG PHẦN CODE, BẮT BUỘC PHẢI VIẾT CHÚ THÍCH (COMMENT) GIẢI THÍCH CHI TIẾT CHO TỪNG DÒNG CODE ĐỂ HỌC SINH DỄ HIỂU NHẤT.
4. "starterCode": Đoạn mã nguồn mẫu dạng đục lỗ (fill-in-the-blank) dựa trên lời giải hoàn chỉnh để học sinh luyện tập. Hãy lấy mã nguồn lời giải chuẩn, giữ lại cấu trúc chính và thực hiện "đục lỗ" (thay thế bằng ký tự '___' hoặc '_____') khoảng 70% các yếu tố trên các dòng code (chỉ hiển thị gợi ý tối đa 30% mã nguồn đáp án, như một vài từ khóa hoặc khung hàm cơ bản, còn lại đục lỗ toàn bộ). Các chú thích giải thích (comments) vẫn được giữ lại để học sinh biết cần điền gì vào chỗ trống.

Lưu ý: Chỉ trả về chuỗi JSON thô, không bọc bởi \`\`\`json.`;

        const userQuery = `Hãy phân tích bài tập trong ảnh và giải bằng ngôn ngữ ${selectedLangName}. ${customPrompt ? `Yêu cầu thêm: "${customPrompt}"` : ""}`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: userQuery },
                        { inlineData: { mimeType: "image/png", data: base64Image.split(',')[1] } }
                    ]
                }
            ],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        keyConcepts: { type: "STRING" },
                        stepByStep: { type: "STRING" },
                        fullSolution: { type: "STRING" },
                        starterCode: { type: "STRING" }
                    },
                    required: ["keyConcepts", "stepByStep", "fullSolution", "starterCode"]
                }
            }
        };

        const fetchWithRetry = async (url, options, retries = 5, delay = 1000) => {
            try {
                const response = await fetch(url, options);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                return await response.json();
            } catch (err) {
                if (retries <= 1) throw err;
                await new Promise((res) => setTimeout(res, delay));
                return fetchWithRetry(url, options, retries - 1, delay * 2);
            }
        };

        return await fetchWithRetry(endpointUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(file);
                setImagePreview(reader.result);
                showToast("Đã tải ảnh lên thành công!");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e) => e.preventDefault();
    
    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(file);
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Hàm gọi AI phân tích đề bài
    const handleSolveExercise = async () => {
        if (!imagePreview) return showToast("Vui lòng tải ảnh bài tập lên!", "error");
        setIsLoading(true);
        setApiStatus("loading");
        setAnalysisResult(null);
        setGradingResult(null);

        try {
            const data = await generateSolutionWithGemini(imagePreview, requirements);
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (jsonText) {
                jsonText = jsonText.replace(/^```json/im, "").replace(/```$/m, "").trim();
                const parsedResult = JSON.parse(jsonText);
                setAnalysisResult(parsedResult);
                
                // Thiết lập template code ban đầu
                let defaultTemplate = parsedResult.starterCode;
                if (!defaultTemplate || !defaultTemplate.trim()) {
                    if (language === 'python') defaultTemplate = "# Viết mã Python của bạn tại đây\n\n";
                    else if (language === 'cpp') defaultTemplate = "// Viết mã C++ của bạn tại đây\n\n";
                    else if (language === 'scratch') defaultTemplate = "// Viết mã Scratchblocks của bạn tại đây\n\n";
                    else if (language === 'gamemaker') defaultTemplate = "// Viết mã GML của bạn tại đây\n\n";
                }
                
                setUserCode(defaultTemplate);

                // Lưu vào lịch sử học tập
                const itemId = Date.now();
                const newHistoryItem = {
                    id: itemId,
                    title: requirements.trim() || `Bài tập ${language.toUpperCase()}`,
                    imagePreview: imagePreview,
                    language: language,
                    analysisResult: parsedResult,
                    userCode: defaultTemplate,
                    gradingResult: null
                };

                const updatedHistory = [newHistoryItem, ...history];
                setHistory(updatedHistory);
                localStorage.setItem("homework_history", JSON.stringify(updatedHistory));
                setActiveItemId(itemId);

                showToast("Đã phân tích đề bài và tạo hướng dẫn thành công! 🎉");
                setApiStatus("ready");
            }
        } catch (err) {
            setApiStatus("error");
            console.error("Lỗi chi tiết:", err);
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Reset trạng thái làm bài mới
    const handleReset = () => {
        setImage(null);
        setImagePreview(null);
        setRequirements("");
        setAnalysisResult(null);
        setUserCode("# Viết mã Python của bạn tại đây\n\n");
        setGradingResult(null);
        setActiveItemId(null);
        setActiveTab('practice');
        showToast("Đã đặt lại trang thái.");
    };

    // Theo dõi đổi ngôn ngữ để cập nhật mẫu ghi chú trong trình code
    useEffect(() => {
        if (!analysisResult) {
            if (language === 'python') setUserCode("# Viết mã Python của bạn tại đây\n\n");
            else if (language === 'cpp') setUserCode("// Viết mã C++ của bạn tại đây\n\n");
            else if (language === 'scratch') setUserCode("// Viết mã Scratchblocks của bạn tại đây\n\n");
            else if (language === 'gamemaker') setUserCode("// Viết mã GML của bạn tại đây\n\n");
        }
    }, [language, analysisResult]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col pb-16 transition-colors duration-300">
            {/* Hệ thống Toast thông báo */}
            <div className="fixed top-5 right-5 z-50 space-y-3 pointer-events-none w-80">
                {notifications.map((toast) => (
                    <div 
                        key={toast.id} 
                        className={`p-4 rounded-xl shadow-lg border pointer-events-auto flex items-center gap-2.5 animate-fade-in ${
                            toast.type === "error" 
                                ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40" 
                                : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40"
                        }`}
                    >
                        <span className="text-lg">{toast.type === 'error' ? '❌' : '✨'}</span>
                        <p className="text-sm font-semibold leading-snug">{toast.message}</p>
                    </div>
                ))}
            </div>

            {/* Header thanh tiêu đề */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 sticky top-0 z-30 shadow-sm transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v13m0-13c-1.168-.776-2.754-1.253-4.5-1.253S4.168 5.224 3 6v13c1.168-.776 2.754-1.253 4.5-1.253s3.332.477 4.5 1.253m0-13c1.168-.776 2.754-1.253 4.5-1.253s3.332.477 4.5 1.253v13c-1.168-.776-2.754-1.253-4.5-1.253s-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">HỌC DỄ DÀNG</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Nút bật tắt Dark Mode */}
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
                {/* CỘT TRÁI (Cấu hình, Ngôn ngữ, Tải ảnh, Lịch sử) */}
                <section className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24 z-10">
                    
                    {/* CẤU HÌNH API KEY */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Cấu hình API Key
                            </h2>
                            {userApiKey ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                    Đã lưu
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                    Chưa lưu
                                </span>
                            )}
                        </div>
                        
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Nhập API Key của bạn để sử dụng AI giải bài. Khóa được lưu cục bộ trên trình duyệt của bạn.
                        </p>
                        
                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    ref={apiKeyInputRef}
                                    type={showApiKey ? "text" : "password"}
                                    value={tempApiKey}
                                    onChange={(e) => setTempApiKey(e.target.value)}
                                    placeholder="Nhập Gemini API Key tại đây..."
                                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-slate-800 dark:text-slate-100 transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showApiKey ? "👁️" : "🙈"}
                                </button>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveApiKey}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition shadow-sm cursor-pointer"
                                >
                                    Lưu Khóa
                                </button>
                                {userApiKey && (
                                    <button
                                        onClick={handleDeleteApiKey}
                                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/20 active:scale-[0.98] transition border border-red-100 dark:border-red-900/30 cursor-pointer"
                                    >
                                        Xóa Khóa
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Chưa có API Key?</span>
                            <a
                                href="https://aistudio.google.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                                Lấy miễn phí tại AI Studio
                            </a>
                        </div>
                    </div>

                    {/* LỰA CHỌN NGÔN NGỮ */}
                    <LanguageSelector 
                        selectedLanguage={language} 
                        onLanguageChange={(lang) => {
                            if (activeItemId) {
                                // Nếu đang chọn một bài tập lịch sử, cảnh báo đổi ngôn ngữ sẽ giải lại
                                showToast("Đổi ngôn ngữ, vui lòng tải ảnh hoặc phân tích lại đề!", "error");
                            }
                            setLanguage(lang);
                        }} 
                    />

                    {/* TẢI LÊN BÀI TẬP */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative transition-all duration-300">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                            </svg>
                            Tải Lên Bài Tập
                        </h2>
                        
                        <div 
                            onDragOver={handleDragOver} 
                            onDrop={handleDrop} 
                            onClick={() => !imagePreview && fileInputRef.current.click()} 
                            className="border-2 border-dashed border-slate-350 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/60 transition group text-center"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            {imagePreview ? (
                                <img src={imagePreview} className="max-h-[180px] rounded-lg shadow-sm" alt="preview" />
                            ) : (
                                <div className="text-center text-slate-500 dark:text-slate-400 text-sm group-hover:text-indigo-500 transition-colors">
                                    <span className="text-3xl block mb-2">📸</span>
                                    Nhấp hoặc kéo thả ảnh đề bài vào đây
                                </div>
                            )}
                        </div>

                        {imagePreview && (
                            <button 
                                onClick={handleReset} 
                                className="mt-3 text-red-500 text-xs font-semibold w-full text-center hover:underline cursor-pointer"
                            >
                                Xóa đề bài này để làm bài khác
                            </button>
                        )}

                        <div className="mt-4 space-y-3">
                            <textarea
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                                placeholder="Ghi chú yêu cầu thêm cho AI (ví dụ: giải thích dòng 4, viết ngắn gọn...)"
                                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none h-18 placeholder:text-slate-400"
                            />
                            
                            <button 
                                onClick={handleSolveExercise} 
                                disabled={isLoading || !imagePreview} 
                                className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:dark:bg-indigo-950/20 transition shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                     <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang phân tích...</>
                                ) : "Phân Tích & Giải Bài"}
                            </button>
                        </div>
                    </div>

                    {/* TIẾN TRÌNH HỌC TẬP */}
                    <ProgressDashboard history={history} />

                    {/* LỊCH SỬ BÀI TẬP ĐÃ LÀM */}
                    <HistorySidebar 
                        history={history} 
                        activeItemId={activeItemId}
                        onItemSelect={handleSelectHistoryItem}
                        onItemDelete={handleDeleteHistoryItem}
                    />

                </section>

                {/* CỘT PHẢI (Chi tiết giải bài & Trình viết code) */}
                <section className="lg:col-span-8 h-auto relative z-0">
                    {isLoading && (
                         <div className="min-h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm p-8">
                             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="font-semibold text-sm">Hệ thống AI đang đọc ảnh và lập trình bài giải...</p>
                             <p className="text-xs text-slate-400 mt-1">Thông thường quá trình này mất khoảng 5-10 giây.</p>
                         </div>
                    )}

                    {!isLoading && analysisResult && (
                        <SolutionDetails 
                            analysisResult={analysisResult}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            renderCodePlayground={() => (
                                <CodePlayground 
                                    language={language}
                                    userCode={userCode}
                                    onCodeChange={setUserCode}
                                    onExportCode={handleExportCode}
                                    onCheckCode={handleCheckCode}
                                    isCheckingCode={isCheckingCode}
                                    gradingResult={gradingResult}
                                    onSimulateRun={handleSimulateRun}
                                />
                            )}
                        />
                    )}

                    {!analysisResult && !isLoading && (
                        <div className="min-h-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm p-8 text-center select-none">
                            <span className="text-5xl mb-4 animate-bounce">🤖</span>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Trợ Lý AI Sẵn Sàng</h3>
                            <p className="text-sm max-w-xs leading-relaxed text-slate-500">
                                Hãy chọn ngôn ngữ lập trình, tải ảnh chụp đề bài lên và nhấn "Phân Tích & Giải Bài" để bắt đầu học lập trình.
                            </p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
