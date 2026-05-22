const { useState, useRef, useEffect, useCallback } = React;

// Cấu hình Firebase & Gemini
const appId = typeof __app_id !== 'undefined' ? __app_id : 'study-helper-app';


function App() {
    const [userApiKey, setUserApiKey] = useState(localStorage.getItem("gemini_api_key") || "");
    const [tempApiKey, setTempApiKey] = useState(localStorage.getItem("gemini_api_key") || "");
    const [showApiKey, setShowApiKey] = useState(false);
    const apiKeyInputRef = useRef(null);

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [requirements, setRequirements] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiStatus, setApiStatus] = useState("ready");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const fileInputRef = useRef(null);

    // Trạng thái cho tính năng luyện tập viết code & chấm bài AI
    const [showPractice, setShowPractice] = useState(true);
    const [userCode, setUserCode] = useState("# Viết mã Python của bạn tại đây\n\n");
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [gradingResult, setGradingResult] = useState(null);
    const editorInstanceRef = useRef(null);

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

    const handleDeleteApiKey = () => {
        localStorage.removeItem("gemini_api_key");
        setUserApiKey("");
        setTempApiKey("");
        showToast("Đã xóa Gemini API Key.", "error");
    };

    // Sử dụng Callback Ref để quản lý vòng đời của CodeMirror an toàn và chính xác hơn
    const handleEditorRef = useCallback((el) => {
        if (el) {
            if (!editorInstanceRef.current) {
                editorInstanceRef.current = CodeMirror.fromTextArea(el, {
                    mode: "python",
                    theme: "material-darker",
                    lineNumbers: true,
                    indentUnit: 4,
                    tabSize: 4,
                    lineWrapping: true,
                    extraKeys: {
                        "Tab": function(cm) {
                            var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                            cm.replaceSelection(spaces);
                        }
                    }
                });

                editorInstanceRef.current.on("change", (instance) => {
                    setUserCode(instance.getValue());
                });
            }
        } else {
            if (editorInstanceRef.current) {
                editorInstanceRef.current.toTextArea();
                editorInstanceRef.current = null;
            }
        }
    }, []);

    // Đồng bộ userCode từ bên ngoài vào CodeMirror khi có kết quả mới
    useEffect(() => {
        if (editorInstanceRef.current && editorInstanceRef.current.getValue() !== userCode) {
            editorInstanceRef.current.setValue(userCode);
        }
    }, [userCode]);

    const handleExportPython = () => {
        if (!userCode.trim()) {
            showToast("Không có mã nguồn để tải!", "error");
            return;
        }
        const blob = new Blob([userCode], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "bai_lam.py";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Đã tải xuống tệp bai_lam.py thành công!");
    };

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

        try {
            const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${userApiKey}`;
            
            const systemInstruction = `Bạn là một giáo viên dạy lập trình Python nghiêm khắc nhưng tận tâm.
Nhiệm vụ của bạn là kiểm tra xem đoạn mã Python của học sinh có giải quyết đúng bài tập trong hình ảnh và đúng yêu cầu của đề bài hay không.
Hãy so sánh mã của học sinh với lời giải chuẩn: ${analysisResult?.fullSolution || ""}.
Yêu cầu trả về định dạng JSON (bắt buộc có các trường sau):
1. "status": Trạng thái ("correct" - Đúng, "incorrect" - Sai, "partial" - Đúng một phần).
2. "score": Điểm số từ 0 đến 100 (số nguyên).
3. "feedback": Nhận xét chi tiết từng dòng hoặc các lỗi logic, lỗi cú pháp, cách cải tiến (viết bằng tiếng Việt).
4. "suggestedFix": Đoạn mã sửa đổi gợi ý nếu học sinh làm sai (đặt trong khối \`\`\`python ... \`\`\`).

Lưu ý: Chỉ trả về chuỗi JSON thô, không bọc bởi \`\`\`json.`;

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: `Đây là mã nguồn Python học sinh tự viết:\n\n\`\`\`python\n${userCode}\n\`\`\`` },
                            { inlineData: { mimeType: "image/png", data: imagePreview.split(',')[1] } }
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

    const showToast = (message, type = "success") => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((item) => item.id !== id));
        }, 4000);
    };

    const generateSolutionWithGemini = async (base64Image, customPrompt) => {
        // Kiểm tra xem người dùng đã cấu hình API key chưa
        if (!userApiKey) {
            showToast("Vui lòng điền Gemini API Key ở cột cấu hình để tiếp tục giải bài!", "error");
            if (apiKeyInputRef.current) {
                apiKeyInputRef.current.focus();
                apiKeyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            throw new Error("Missing Gemini API Key");
        }

        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${userApiKey}`;
        
        // ÉP AI XUẤT ĐỊNH DẠNG CÓ CẤU TRÚC
        const systemInstruction = `Bạn là một trợ lý giáo dục AI xuất sắc tại Việt Nam.
Nhiệm vụ của bạn là đọc hình ảnh bài tập được gửi lên, phân tích đề bài và trả về câu trả lời có cấu trúc JSON.
Yêu cầu định dạng JSON (bắt buộc có 4 trường):
1. "keyConcepts": Tóm tắt kiến thức.
2. "stepByStep": Hướng dẫn giải từng bước. BẮT BUỘC NGẮT DÒNG RÕ RÀNG GIỮA CÁC BƯỚC. Viết rõ chữ "Bước 1:", "Bước 2:" ở đầu mỗi bước.
3. "fullSolution": Lời giải hoàn chỉnh (Code phải bọc trong \`\`\`ngôn_ngữ). ĐẶC BIỆT LƯU Ý: TRONG PHẦN CODE, BẮT BUỘC PHẢI VIẾT CHÚ THÍCH (COMMENT) GIẢI THÍCH CHI TIẾT CHO TỪNG DÒNG CODE ĐỂ HỌC SINH DỄ HIỂU NHẤT.
4. "starterCode": Đoạn mã nguồn Python mẫu ban đầu cho học sinh luyện tập. Đoạn mã này CHỈ chứa các chú thích (comment) hướng dẫn từng bước chi tiết (viết bằng tiếng Việt, bắt đầu bằng dấu #) và các dòng trống ở dưới mỗi chú thích để học sinh tự điền code vào. Tuyệt đối không chứa code logic hoàn chỉnh, chỉ chứa các dòng comment và dòng trống để học sinh tự lập trình ngay bên dưới.

Lưu ý: Chỉ trả về chuỗi JSON thô, không bọc bởi \`\`\`json.`;

        const userQuery = `Hãy phân tích bài tập trong ảnh. ${customPrompt ? `Yêu cầu thêm: "${customPrompt}"` : ""}`;

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

    const handleSolveExercise = async () => {
        if (!imagePreview) return showToast("Vui lòng tải ảnh bài tập lên!", "error");
        setIsLoading(true);
        setError(null);
        setApiStatus("loading");

        try {
            const data = await generateSolutionWithGemini(imagePreview, requirements);
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (jsonText) {
                // Dọn dẹp markdown code block nếu Gemini lỡ trả về ```json ... ```
                jsonText = jsonText.replace(/^```json/im, "").replace(/```$/m, "").trim();
                
                const parsedResult = JSON.parse(jsonText);
                setAnalysisResult(parsedResult);
                
                const codeTemplate = parsedResult.starterCode || "# Viết mã Python của bạn tại đây\n\n";
                setUserCode(codeTemplate);
                if (editorInstanceRef.current) {
                    editorInstanceRef.current.setValue(codeTemplate);
                }

                showToast("Đã tạo lời giải thành công! 🎉");
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

    const handleReset = () => {
        setImage(null);
        setImagePreview(null);
        setRequirements("");
        setAnalysisResult(null);
        setShowPractice(true);
        setUserCode("# Viết mã Python của bạn tại đây\n\n");
        setGradingResult(null);
        showToast("Đã dọn dẹp trang thái.");
    };

    const handleCopyToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast("Đã sao chép nội dung vào khay nhớ tạm!");
        } catch (err) {
            showToast("Sao chép thất bại.", "error");
        }
        document.body.removeChild(textArea);
    };

    // ==========================================
    // RENDERER MARKDOWN & SYNTAX HIGHLIGHTER
    // ==========================================

    const renderSuggestedFixCode = (suggestedFixText) => {
        if (!suggestedFixText) return null;
        let code = suggestedFixText.trim();
        let lang = "python";

        if (code.startsWith("```")) {
            const lines = code.split("\n");
            const firstLine = lines[0].replace("```", "").trim();
            if (firstLine) lang = firstLine;
            if (lines[lines.length - 1].startsWith("```")) {
                code = lines.slice(1, -1).join("\n");
            } else {
                code = lines.slice(1).join("\n");
            }
        }

        return (
            <div className="my-4 rounded-xl overflow-hidden shadow-xl bg-[#1E1E1E] border border-slate-700/80 group">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#333333] select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                        </div>
                        <div className="text-xs font-mono font-bold text-[#4EC9B0] uppercase tracking-wider">{lang}</div>
                    </div>
                    <button 
                        onClick={() => handleCopyToClipboard(code)} 
                        className="px-2.5 py-1 text-xs font-medium text-[#858585] hover:text-[#CCCCCC] hover:bg-[#333333] rounded transition flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg> Sao chép mã
                    </button>
                </div>
                <div className="p-3 overflow-x-auto m-0 bg-[#1E1E1E] custom-scrollbar">
                    {renderSyntaxHighlightedCode(code)}
                </div>
            </div>
        );
    };

    const renderSyntaxHighlightedCode = (code) => {
        const lines = code.split('\n');
        
        return (
            <div className="flex flex-col w-full font-mono text-[13px] md:text-sm leading-[1.6]">
                {lines.map((line, index) => {
                    let commentIndex = -1;
                    let inString = false;
                    let stringChar = null;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
                            if (!inString) {
                                inString = true;
                                stringChar = char;
                            } else if (stringChar === char) {
                                inString = false;
                            }
                        }
                        if (!inString) {
                            if (char === '#' || (char === '/' && line[i+1] === '/')) {
                                commentIndex = i;
                                break;
                            }
                        }
                    }
                    
                    let codePart = line;
                    let commentPart = "";
                    
                    if (commentIndex !== -1) {
                        codePart = line.substring(0, commentIndex);
                        commentPart = line.substring(commentIndex);
                    }

                    const highlightCodePart = (text) => {
                        const parts = text.split(/("|')/);
                        let currentQuote = null;
                        
                        return parts.map((part, i) => {
                            if (part === '"' || part === "'") {
                                if (!currentQuote) currentQuote = part;
                                else if (currentQuote === part) currentQuote = null;
                                return <span key={i} className="text-[#CE9178]">{part}</span>;
                            }
                            if (currentQuote) {
                                return <span key={i} className="text-[#CE9178]">{part}</span>;
                            }
                            
                            const words = part.split(/([a-zA-Z0-9_]+)/);
                            return words.map((w, j) => {
                                if (/^(def|class|function|const|let|var|import|from|return)$/.test(w)) {
                                    return <span key={j} className="text-[#569CD6]">{w}</span>;
                                }
                                if (/^(if|else|elif|for|in|while|break|continue)$/.test(w)) {
                                    return <span key={j} className="text-[#C586C0]">{w}</span>;
                                }
                                if (/^(print|input|int|float|str|len|range|console|log)$/.test(w)) {
                                    return <span key={j} className="text-[#DCDCAA]">{w}</span>;
                                }
                                if (/^(\d+)$/.test(w)) {
                                    return <span key={j} className="text-[#B5CEA8]">{w}</span>;
                                }
                                return <span key={j} className="text-[#D4D4D4]">{w}</span>;
                            });
                        });
                    };

                    return (
                        <div key={index} className="flex hover:bg-[#2a2d2e] px-2 rounded transition-colors group">
                            <span className="w-8 flex-shrink-0 text-right pr-4 select-none text-[#6e7681] border-r border-[#404040] mr-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                {index + 1}
                            </span>
                            <span className="flex-1 whitespace-pre-wrap break-all">
                                {highlightCodePart(codePart)}
                                {commentPart && <span className="text-[#6A9955] italic">{commentPart}</span>}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSimpleMarkdown = (rawText) => {
        if (!rawText) return null;

        let text = rawText.replace(/\\n/g, '\n').replace(/\\t/g, '  ');
        text = text.replace(/(?<!\n)(Bước\s+\d+:)/gi, '\n$1'); 

        const lines = text.split("\n");
        let inTable = false, tableRows = [], inCodeBlock = false, codeBlockText = "", language = "code";
        const renderedElements = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine === "") {
                renderedElements.push(<div key={i} className="h-1.5"></div>);
                continue;
            }

            if (trimmedLine.startsWith("```")) {
                if (inCodeBlock) {
                    const codeToRender = codeBlockText.replace(/\n$/, "");
                    renderedElements.push(
                        <div key={`code-${i}`} className="my-6 rounded-xl overflow-hidden shadow-xl bg-[#1E1E1E] border border-slate-700/80 group">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#333333] select-none">
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                                    </div>
                                    <div className="text-xs font-mono font-bold text-[#4EC9B0] uppercase tracking-wider">{language || "Source Code"}</div>
                                </div>
                                <button onClick={() => handleCopyToClipboard(codeToRender)} className="px-2.5 py-1 text-xs font-medium text-[#858585] hover:text-[#CCCCCC] hover:bg-[#333333] rounded transition flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Copy Code
                                </button>
                            </div>
                            <div className="p-3 overflow-x-auto m-0 bg-[#1E1E1E] custom-scrollbar">
                                {renderSyntaxHighlightedCode(codeToRender)}
                            </div>
                        </div>
                    );
                    codeBlockText = "";
                    inCodeBlock = false;
                } else {
                    language = trimmedLine.replace(/```/g, "").trim();
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockText += line + "\n";
                continue;
            }

            const isStepMatch = trimmedLine.match(/^(?:\*?\s*)?(?:\**Bước\s+(\d+):?\**|(\d+)\.)(.*)/i);
            
            if (isStepMatch) {
                const stepNumber = isStepMatch[1] || isStepMatch[2];
                const stepContent = isStepMatch[3].trim();

                renderedElements.push(
                    <div key={`step-${i}`} className="flex gap-4 items-start p-4 md:p-5 my-4 bg-slate-50/50 dark:bg-slate-800/40 border border-indigo-100/50 dark:border-slate-700/50 rounded-2xl relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 opacity-80"></div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-indigo-100 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-sm text-lg">
                            {stepNumber}
                        </div>
                        <div className="flex-1 pt-0.5">
                            <h4 className="text-indigo-800 dark:text-indigo-300 font-bold mb-1.5 text-sm uppercase tracking-wide">
                                Bước {stepNumber}
                            </h4>
                            <p className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
                                {parseInlineStyles(stepContent)}
                            </p>
                        </div>
                    </div>
                );
                continue;
            }

            if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
                inTable = true;
                tableRows.push(trimmedLine);
                continue;
            } else if (inTable) {
                const processedTable = renderHTMLTable(tableRows, i);
                if (processedTable) renderedElements.push(processedTable);
                tableRows = [];
                inTable = false;
            }

            if (trimmedLine.startsWith("# ")) {
                renderedElements.push(<h1 key={i} className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-6 mb-4">{parseInlineStyles(trimmedLine.slice(2))}</h1>);
            } else if (trimmedLine.startsWith("## ")) {
                renderedElements.push(<h2 key={i} className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-5 mb-3">{parseInlineStyles(trimmedLine.slice(3))}</h2>);
            } else if (trimmedLine.startsWith("### ")) {
                renderedElements.push(<h3 key={i} className="text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-2 flex items-center gap-2"><span className="text-indigo-500">✦</span>{parseInlineStyles(trimmedLine.slice(4))}</h3>);
            } else if (trimmedLine.startsWith("> ")) {
                renderedElements.push(
                    <div key={i} className="pl-4 py-2 my-3 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-r-lg italic text-slate-700 dark:text-slate-300">
                        {parseInlineStyles(trimmedLine.slice(2))}
                    </div>
                );
            } else if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
                renderedElements.push(
                    <div key={i} className="flex gap-2 items-start my-1.5 text-slate-700 dark:text-slate-300">
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span className="leading-relaxed">{parseInlineStyles(trimmedLine.slice(2))}</span>
                    </div>
                );
            } else {
                renderedElements.push(<p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed my-2 whitespace-pre-wrap">{parseInlineStyles(line)}</p>);
            }
        }

        if (inTable && tableRows.length > 0) {
            renderedElements.push(renderHTMLTable(tableRows, lines.length));
        }

        return <div className="space-y-1">{renderedElements}</div>;
    };

    const parseInlineStyles = (text) => {
        const renderStyledSpan = (str) => {
            const codeSplits = str.split('`');
            return codeSplits.map((codePart, codeIdx) => {
                if (codeIdx % 2 !== 0) {
                    return <code key={`c-${codeIdx}`} className="px-1.5 py-0.5 mx-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-pink-600 dark:text-pink-400 font-mono text-[13px]">{codePart}</code>;
                }
                const boldSplits = codePart.split('**');
                return boldSplits.map((boldPart, boldIdx) => {
                    if (boldIdx % 2 !== 0) {
                        return <strong key={`b-${boldIdx}`} className="font-bold text-slate-900 dark:text-white">{boldPart}</strong>;
                    }
                    return boldPart;
                });
            });
        };
        return <span>{renderStyledSpan(text)}</span>;
    };

    const renderHTMLTable = (rows, keyId) => {
        const filteredRows = rows.filter(row => !row.match(/^\|\s*[:-]+\s*\|/));
        if (filteredRows.length < 2) return null;
        const parseCells = (rowText) => rowText.substring(1, rowText.length - 1).split("|").map(c => c.trim());
        const headerCells = parseCells(filteredRows[0]);
        const bodyRows = filteredRows.slice(1).map(parseCells);
        return (
            <div key={`table-${keyId}`} className="my-4 overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                        <tr>{headerCells.map((cell, idx) => <th key={idx} className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">{parseInlineStyles(cell)}</th>)}</tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {bodyRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                {row.map((cell, cellIdx) => <td key={cellIdx} className="px-4 py-3 text-slate-600 dark:text-slate-300">{parseInlineStyles(cell)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col pb-16">
            <div className="fixed top-5 right-5 z-50 space-y-3 pointer-events-none w-80">
                {notifications.map((toast) => (
                    <div key={toast.id} className={`p-4 rounded-xl shadow-lg border pointer-events-auto ${toast.type === "error" ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                ))}
            </div>

            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v13m0-13c-1.168-.776-2.754-1.253-4.5-1.253S4.168 5.224 3 6v13c1.168-.776 2.754-1.253 4.5-1.253s3.332.477 4.5 1.253m0-13c1.168-.776 2.754-1.253 4.5-1.253s3.332.477 4.5 1.253v13c-1.168-.776-2.754-1.253-4.5-1.253s-3.332.477-4.5 1.253"></path></svg>
                        </div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">HỌC DỄ DÀNG</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
                {/* CỘT TRÁI */}
                <section className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24 z-10">
                    {/* CẤU HÌNH API KEY */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                                Cấu hình API Key
                            </h2>
                            {userApiKey ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã lưu
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Chưa lưu
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
                                    {showApiKey ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                    )}
                                </button>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveApiKey}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition shadow-sm"
                                >
                                    Lưu Khóa
                                </button>
                                {userApiKey && (
                                    <button
                                        onClick={handleDeleteApiKey}
                                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/20 active:scale-[0.98] transition border border-red-100 dark:border-red-900/30"
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
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </a>
                        </div>
                    </div>

                    {/* TẢI LÊN BÀI TẬP */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z"></path></svg>
                            Tải Lên Bài Tập
                        </h2>
                        <div onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => !imagePreview && fileInputRef.current.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:bg-slate-50 transition group">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            {imagePreview ? (
                                <img src={imagePreview} className="max-h-[220px] rounded-lg shadow-sm" alt="preview" />
                            ) : (
                                <div className="text-center text-slate-500 text-sm group-hover:text-indigo-500 transition-colors">Nhấp hoặc kéo thả ảnh vào đây</div>
                            )}
                        </div>
                        {imagePreview && (
                            <button onClick={handleReset} className="mt-3 text-red-500 text-sm font-semibold w-full text-center hover:underline">Xóa ảnh này</button>
                        )}
                        <button onClick={handleSolveExercise} disabled={isLoading || !imagePreview} className="w-full mt-5 py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 transition shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex justify-center items-center gap-2">
                            {isLoading ? (
                                 <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang xử lý...</>
                            ) : "Phân Tích & Giải Bài"}
                        </button>
                    </div>
                </section>

                {/* CỘT PHẢI */}
                <section className="lg:col-span-8 h-auto relative z-0">
                    {isLoading && (
                         <div className="min-h-[400px] bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
                             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 shadow-sm"></div>
                             <p className="font-medium">AI đang đọc hình ảnh và giải bài...</p>
                         </div>
                    )}

                    {analysisResult && !isLoading && (
                        <div className="space-y-6">
                            {/* Thanh chuyển đổi Tab */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-auto">
                                <button 
                                    onClick={() => setShowPractice(true)} 
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${showPractice ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                >
                                    💻 Luyện Tập Viết Code
                                </button>
                                <button 
                                    onClick={() => setShowPractice(false)} 
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!showPractice ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                >
                                    💡 Đáp Án Hoàn Chỉnh
                                </button>
                            </div>

                            {/* Tab 1: Luyện Tập Viết Code */}
                            {showPractice && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Hướng Dẫn Giải ở trên */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10">
                                        <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <span className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">💡</span>
                                            Hướng Dẫn Giải
                                        </h3>
                                        <div className="text-slate-700 dark:text-slate-300">
                                            {renderSimpleMarkdown(analysisResult.stepByStep)}
                                        </div>
                                    </div>

                                    {/* Phần nhập code ở dưới */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <span>💻</span> Luyện Tập Lập Trình Python
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Viết mã của bạn để giải quyết bài tập và kiểm tra bằng trí tuệ nhân tạo.</p>
                                            </div>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button onClick={handleExportPython} className="flex-1 md:flex-initial px-4 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm">
                                                    📥 Tải file .py
                                                </button>
                                            </div>
                                        </div>

                                        {/* Editor Container */}
                                        <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                            <textarea ref={handleEditorRef} defaultValue={userCode}></textarea>
                                        </div>

                                        <div className="flex justify-between items-center gap-4">
                                            <div className="text-xs text-slate-400 dark:text-slate-500 italic max-w-[60%]">
                                                Lưu ý: Viết mã nguồn Python giải bài (điền dưới mỗi dòng chú thích), sau đó nhấn "Kiểm Tra Bài Làm" để nhận đánh giá từ giáo viên AI.
                                            </div>
                                            <button 
                                                onClick={handleCheckCode} 
                                                disabled={isCheckingCode} 
                                                className="px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                                            >
                                                {isCheckingCode ? (
                                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang kiểm tra...</>
                                                ) : (
                                                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Kiểm Tra Bài Làm</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Kết quả chấm bài */}
                                        {gradingResult && (
                                            <div className={`p-6 rounded-2xl border animate-fade-in ${
                                                gradingResult.status === "correct" ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300" :
                                                gradingResult.status === "partial" ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300" :
                                                "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300"
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
                                                    
                                                    {gradingResult.suggestedFix && gradingResult.suggestedFix.trim() && (
                                                        <div>
                                                            <h5 className="font-bold text-sm uppercase tracking-wide opacity-80 mb-2">Mã nguồn gợi ý sửa đổi:</h5>
                                                            <div className="text-slate-800 dark:text-slate-200">
                                                                {renderSuggestedFixCode(gradingResult.suggestedFix)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Đáp Án Hoàn Chỉnh */}
                            {!showPractice && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto">
                                    <div className="p-6 md:p-10 space-y-12 animate-fade-in">
                                        <section>
                                            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                <span className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">💻</span>
                                                Lời Giải Hoàn Chỉnh (Đáp Án)
                                            </h3>
                                            <div className="text-slate-700 dark:text-slate-300">
                                                {renderSimpleMarkdown(analysisResult.fullSolution)}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!analysisResult && !isLoading && (
                        <div className="min-h-[400px] bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
                            <span className="text-4xl mb-3 opacity-50">🤖</span>
                            <p>Hãy tải ảnh bài tập lên để bắt đầu</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

// Khởi tạo root và render React Component
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
