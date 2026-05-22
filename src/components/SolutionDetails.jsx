import React from 'react';

export default function SolutionDetails({ analysisResult, activeTab, onTabChange, renderCodePlayground }) {
    if (!analysisResult) return null;

    // ==========================================
    // CUSTOM MARKDOWN & SYNTAX HIGHLIGHTER PARSERS
    // ==========================================

    const handleCopyToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error("Sao chép thất bại:", err);
        }
        document.body.removeChild(textArea);
    };

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
                        className="px-2.5 py-1 text-xs font-medium text-[#858585] hover:text-[#CCCCCC] hover:bg-[#333333] rounded transition flex items-center gap-1.5 opacity-80 group-hover:opacity-100 cursor-pointer"
                    >
                        Sao chép mã
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
                                <button onClick={() => handleCopyToClipboard(codeToRender)} className="px-2.5 py-1 text-xs font-medium text-[#858585] hover:text-[#CCCCCC] hover:bg-[#333333] rounded transition flex items-center gap-1.5 opacity-80 group-hover:opacity-100 cursor-pointer">
                                    Copy Code
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
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-750 border border-indigo-100 dark:border-slate-650 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-sm text-lg">
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
                renderedElements.push(<h1 key={i} className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-455 mt-6 mb-4">{parseInlineStyles(trimmedLine.slice(2))}</h1>);
            } else if (trimmedLine.startsWith("## ")) {
                renderedElements.push(<h2 key={i} className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-5 mb-3">{parseInlineStyles(trimmedLine.slice(3))}</h2>);
            } else if (trimmedLine.startsWith("### ")) {
                renderedElements.push(<h3 key={i} className="text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-2 flex items-center gap-2"><span className="text-indigo-500">✦</span>{parseInlineStyles(trimmedLine.slice(4))}</h3>);
            } else if (trimmedLine.startsWith("> ")) {
                renderedElements.push(
                    <div key={i} className="pl-4 py-2 my-3 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-r-lg italic text-slate-700 dark:text-slate-305">
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
                        <tr>{headerCells.map((cell, idx) => <th key={idx} className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-350">{parseInlineStyles(cell)}</th>)}</tr>
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
        <div className="space-y-6">
            {/* Thanh chuyển đổi Tab */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-750 w-full max-w-md mx-auto shadow-inner">
                <button 
                    onClick={() => onTabChange('practice')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'practice' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-700/50' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'}`}
                >
                    💻 Luyện Tập Viết Code
                </button>
                <button 
                    onClick={() => onTabChange('solution')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'solution' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-700/50' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'}`}
                >
                    💡 Đáp Án Hoàn Chỉnh
                </button>
            </div>

            {/* Tab 1: Luyện Tập Viết Code */}
            {activeTab === 'practice' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Hướng Dẫn Giải ở trên */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-10">
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 select-none">
                            <span className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">💡</span>
                            Hướng Dẫn Giải (Lý thuyết)
                        </h3>
                        <div className="text-slate-700 dark:text-slate-300">
                            {renderSimpleMarkdown(analysisResult.keyConcepts)}
                            <div className="h-4"></div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-4 mb-2 flex items-center gap-2 select-none">
                                <span className="text-indigo-500">✦</span>Các bước thực hiện
                            </h4>
                            {renderSimpleMarkdown(analysisResult.stepByStep)}
                        </div>
                    </div>

                    {/* Phần soạn thảo & chấm bài */}
                    {renderCodePlayground()}
                </div>
            )}

            {/* Tab 2: Đáp Án Hoàn Chỉnh */}
            {activeTab === 'solution' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-10 animate-fade-in">
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 select-none">
                        <span className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">💻</span>
                        Lời Giải Hoàn Chỉnh (Đáp Án)
                    </h3>
                    <div className="text-slate-700 dark:text-slate-300">
                        {renderSimpleMarkdown(analysisResult.fullSolution)}
                    </div>
                </div>
            )}
        </div>
    );
}
