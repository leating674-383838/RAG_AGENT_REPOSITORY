import React, { useState, useEffect, useRef } from 'react';
import { Menu, Send, Globe, Loader2, Database, Trash2, ThumbsUp, ThumbsDown, Clock, Bot, Sparkles, MessageCircle, Zap, Copy, Check } from 'lucide-react';
import { fetchMessages, sendChat, clearMessages, submitFeedback } from '../api/client';
import ReactMarkdown from 'react-markdown';
import './ChatArea.css';

const SUGGESTIONS = [
    { icon: <Sparkles size={18} className="suggestion-icon sparkle" />, text: '解释一下量子计算的基本原理' },
    { icon: <MessageCircle size={18} className="suggestion-icon chat-icon" />, text: '帮我写一段 Python 快速排序' },
    { icon: <Zap size={18} className="suggestion-icon zap" />, text: 'React 和 Vue 的主要区别是什么' },
];

const ChatArea = ({ toggleSidebar, currentSession }) => {
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
                const formatted = history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'ai',
                    content: h.content,
                    timestamp: h.created_at || new Date().toISOString()
                }));
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
        setMessages(prev => [...prev, { role: 'user', content: msgText, timestamp: now }]);
        setInput('');
        setIsTyping(true);
        setIsNewChat(false);

        try {
            const resp = await sendChat(currentSession.id, msgText, useWebSearch, useRag);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: resp.reply,
                timestamp: new Date().toISOString(),
                elapsedMs: resp.elapsed_ms
            }]);
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

    const handleFeedback = async (msgIdx, rating) => {
        if (!currentSession?.id) return;
        const msg = messages[msgIdx];
        try {
            await submitFeedback(currentSession.id, msg.content, rating);
            setFeedbackGiven(prev => ({ ...prev, [msgIdx]: rating }));
        } catch (e) {
            console.error('Feedback failed', e);
        }
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <main className="main-content">
            <header className="chat-header glass">
                <button className="menu-btn" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
                <div className="chat-title">
                    <h1>{currentSession ? currentSession.title : "新对话"}</h1>
                </div>
                <div className="header-actions">
                    <button
                        className={`web-search-toggle ${useRag ? 'active' : ''}`}
                        onClick={() => setUseRag(!useRag)}
                        title="知识库检索"
                    >
                        <Database size={18} />
                    </button>
                    <button
                        className={`web-search-toggle ${useWebSearch ? 'active' : ''}`}
                        onClick={() => setUseWebSearch(!useWebSearch)}
                        title="联网搜索"
                        style={{ marginLeft: '8px' }}
                    >
                        <Globe size={18} />
                    </button>
                    <button
                        className="clear-btn"
                        onClick={handleClear}
                        title="清除会话"
                        style={{ marginLeft: '8px' }}
                    >
                        <Trash2 size={18} />
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
                    <div className="suggestions">
                        {SUGGESTIONS.map((s, i) => (
                            <button key={i} className="suggestion-card glass" onClick={() => handleSend(null, s.text)}>
                                {s.icon}
                                <span>{s.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="messages-container">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message-wrapper ${msg.role}`}>
                            <div className="message animate-fade-in">
                                <div className="message-content">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                                {msg.role === 'ai' && (
                                    <button
                                        className="copy-msg-btn"
                                        onClick={() => handleCopy(msg.content, idx)}
                                        title="复制内容"
                                    >
                                        {copiedIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                            <div className="message-meta">
                                <span className="msg-time">
                                    <Clock size={12} />
                                    {formatTime(msg.timestamp)}
                                </span>
                                {msg.elapsedMs && (
                                    <span className="msg-elapsed">耗时 {(msg.elapsedMs / 1000).toFixed(1)}s</span>
                                )}
                                {msg.role === 'ai' && (
                                    <span className="feedback-btns">
                                        <button
                                            className={`fb-btn ${feedbackGiven[idx] === 'useful' ? 'active-up' : ''}`}
                                            onClick={() => handleFeedback(idx, 'useful')}
                                            disabled={!!feedbackGiven[idx]}
                                            title="有用"
                                        >
                                            <ThumbsUp size={14} />
                                        </button>
                                        <button
                                            className={`fb-btn ${feedbackGiven[idx] === 'not_useful' ? 'active-down' : ''}`}
                                            onClick={() => handleFeedback(idx, 'not_useful')}
                                            disabled={!!feedbackGiven[idx]}
                                            title="无用"
                                        >
                                            <ThumbsDown size={14} />
                                        </button>
                                    </span>
                                )}
                            </div>
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
