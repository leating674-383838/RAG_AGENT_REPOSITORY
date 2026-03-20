import React, { useState, useEffect, useRef } from 'react';
import { Menu, Send, Globe, Loader2, Database, Trash2, ThumbsUp, ThumbsDown, Clock, Bot, Copy, Check, Moon, Sun, RefreshCcw, Plus, Folder } from 'lucide-react';
import { fetchMessages, sendChat, clearMessages, submitFeedback, uploadFile, fetchSessions } from '../api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatArea.css';


const ChatArea = ({
    toggleSidebar,
    currentSession,
    sessions,
    onSelectSession,
    onNewSession,
    onSessionUpdate,
    theme,
    toggleTheme,
    deviceId
}) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(true);
    const [useRag, setUseRag] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState({});
    const [isNewChat, setIsNewChat] = useState(true);
    const [copiedIdx, setCopiedIdx] = useState(null);
    const endRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (currentSession) {
            loadHistory();
            setFeedbackGiven({});
            inputRef.current?.focus();
        } else {
            setMessages([]);
            setIsNewChat(true);
        }
    }, [currentSession]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const loadHistory = async () => {
        try {
            const history = await fetchMessages(currentSession.id);
            if (!history || history.length === 0) {
                setMessages([]);
                setIsNewChat(true);
            } else {
                const formatted = (history || []).map(h => h && ({
                    id: h.id,
                    role: h.role === 'user' ? 'user' : 'ai',
                    content: h.content,
                    timestamp: h.created_at || new Date().toISOString()
                })).filter(Boolean);
                setMessages(formatted);
                setIsNewChat(false);
            }
        } catch (e) {
            setMessages([]);
            setIsNewChat(true);
        }
    };

    const handleSend = async (e, suggestedText = null) => {
        if (e) e.preventDefault();
        const msgText = suggestedText || input;
        if (!msgText.trim() || !currentSession?.id) return;

        const now = new Date().toISOString();
        const isFirstMessageInSession = messages.length === 0; // Check before adding user message
        setMessages(prev => [...prev, { role: 'user', content: msgText, timestamp: now }]);
        setInput('');
        setIsTyping(true);
        setIsNewChat(false);

        try {
            const data = await sendChat(currentSession.id, msgText, useWebSearch, useRag);
            setMessages(prev => [...prev, {
                id: data.message_id,
                role: 'ai',
                content: data.reply,
                timestamp: new Date().toISOString(),
                elapsedMs: data.elapsed_ms
            }]);

            // If it's the first message, the session might have been renamed
            if (isFirstMessageInSession && onSessionUpdate) {
                const refreshedSessions = await fetchSessions(null, deviceId);
                const updated = refreshedSessions.find(s => s.id === currentSession.id);
                if (updated) onSessionUpdate(updated);
            }
        } catch (e) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "与服务器通信失败，请稍后重试。",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
            inputRef.current?.focus();
        }
    };

    const handleClear = async () => {
        if (!currentSession?.id) return;
        if (!confirm('确定要清除当前会话所有消息吗？')) return;
        try {
            await clearMessages(currentSession.id);
            setMessages([]);
            setIsNewChat(true);
            setFeedbackGiven({});
        } catch (e) {
            alert('清除失败');
        }
    };

    const handleFeedback = async (msgIdx, type) => {
        if (!currentSession?.id) return;
        const msg = messages[msgIdx];
        if (!msg.id) return;

        const ratingValue = type === 'useful' ? 1 : -1;
        try {
            await submitFeedback(currentSession.id, msg.id, ratingValue);
            setFeedbackGiven(prev => ({ ...prev, [msgIdx]: type }));
        } catch (e) {
            console.error('Feedback failed', e);
        }
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const handleRegenerate = async () => {
        if (!currentSession?.id || isTyping) return;
        // Find last user message
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            handleSend(null, lastUserMsg.content);
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            await uploadFile(file);
            // Optionally add a system message or notification
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `✅ 文件已成功上传并处理: **${file.name}**。您现在可以针对该文件内容进行提问。`,
                timestamp: new Date().toISOString()
            }]);
        } catch (error) {
            alert(`上传失败: ${file.name}`);
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <main className="main-content">
            <header className="chat-header">
                <button className="menu-btn" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
                <div className="chat-title">
                    <h1>{currentSession ? currentSession.title : "新对话"}</h1>
                </div>
                <div className="header-actions">
                    <button
                        className={`header-icon-btn ${useRag ? 'active' : ''}`}
                        onClick={() => setUseRag(!useRag)}
                        title="知识库检索"
                    >
                        <Database size={18} />
                    </button>
                    <button
                        className={`header-icon-btn ${useWebSearch ? 'active' : ''}`}
                        onClick={() => setUseWebSearch(!useWebSearch)}
                        title="联网搜索"
                        style={{ marginLeft: '8px' }}
                    >
                        <Globe size={18} />
                    </button>
                    <button
                        className="header-icon-btn theme-btn"
                        onClick={toggleTheme}
                        title="切换主题"
                        style={{ marginLeft: '8px' }}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </header>

            {isNewChat && !isTyping ? (
                <div className="welcome-screen">
                    <div className="welcome-icon">
                        <Bot size={48} />
                    </div>
                    <h2 className="welcome-title">智能问答助手</h2>
                    <p className="welcome-subtitle">随时提问，AI 为你解答。支持多轮对话，历史记录自动保存。</p>
                </div>
            ) : (
                <div className="messages-container">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message-wrapper ${msg.role}`}>
                            <div className="message animate-fade-in">
                                <div className="message-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code({ node, inline, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline && match ? (
                                                    <SyntaxHighlighter
                                                        style={theme === 'dark' ? oneDark : oneLight}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        {...props}
                                                    >
                                                        {String(children).replace(/\n$/, '')}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            <div className="message-meta">
                                <span className="msg-time">
                                    <Clock size={12} />
                                    {formatTime(msg.timestamp)}
                                </span>
                                {msg.elapsedMs && (
                                    <span className="msg-elapsed">耗时 {(msg.elapsedMs / 1000).toFixed(1)}s</span>
                                )}
                            </div>
                            {msg.role === 'ai' && (
                                <div className="message-actions-bar">
                                    <button
                                        className="action-btn"
                                        onClick={() => handleCopy(msg.content, idx)}
                                        title="复制内容"
                                    >
                                        {copiedIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    <button
                                        className={`action-btn ${feedbackGiven[idx] === 'useful' ? 'active-up' : ''}`}
                                        onClick={() => handleFeedback(idx, 'useful')}
                                        disabled={!!feedbackGiven[idx]}
                                        title="赞"
                                    >
                                        <ThumbsUp size={14} />
                                    </button>
                                    <button
                                        className={`action-btn ${feedbackGiven[idx] === 'not_useful' ? 'active-down' : ''}`}
                                        onClick={() => handleFeedback(idx, 'not_useful')}
                                        disabled={!!feedbackGiven[idx]}
                                        title="踩"
                                    >
                                        <ThumbsDown size={14} />
                                    </button>
                                    {idx === messages.length - 1 && !isTyping && (
                                        <button
                                            className="action-btn"
                                            onClick={handleRegenerate}
                                            title="重新生成"
                                        >
                                            <RefreshCcw size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="message-wrapper ai">
                            <div className="message typing-indicator">
                                <Loader2 className="spinner" size={18} />
                                <span>AI 思考中...</span>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>
            )}

            <div className="input-area">
                <form onSubmit={handleSend} className="input-form">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx,.pdf,.docx,.doc"
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        className={`upload-btn ${uploading ? 'uploading' : ''}`}
                        onClick={handleUploadClick}
                        disabled={uploading || !currentSession}
                        title="上传文件"
                    >
                        {uploading ? <Loader2 className="spinner" size={20} /> : <Plus size={20} />}
                    </button>
                    <input
                        type="text"
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入你的问题..."
                        className="chat-input"
                        disabled={!currentSession}
                    />
                    <button type="submit" className="send-btn" disabled={!input.trim() || !currentSession}>
                        <Send size={18} />
                    </button>
                </form>
                <p className="input-disclaimer">AI 回答仅供参考，请自行验证重要信息</p>
            </div>
        </main>
    );
};

export default ChatArea;
