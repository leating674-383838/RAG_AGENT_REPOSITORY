import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, MessageSquare, Moon, Sun, X,
    FileSpreadsheet, Search, Folder, FolderPlus, MoreHorizontal, ChevronRight, ChevronDown, Trash2, ArrowRight, FileText
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({
    isOpen, closeSidebar,
    sessions, currentSession, onSelectSession, onNewSession
}) => {
    const [showMore, setShowMore] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const handleDeleteSession = async (sessionId) => {
        try {
            const client = await import('../api/client');
            await client.deleteSession(sessionId);
            setDeleteConfirmId(null);
            window.location.reload(); // Temporary measure; ideal would be state sync
        } catch (e) {
            alert("删除失败");
        }
    };

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    // All sessions now go to "Your Chats"
    const allSessions = sessions || [];
    const displayedSessions = showMore ? allSessions : allSessions.slice(0, 10);

    // Search results
    const searchResults = searchQuery.trim()
        ? (sessions || []).filter(s => s && (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : [];


    const getSnippet = (title) => {
        if (!title) return '无内容';
        return title.length > 20 ? title.substring(0, 20) : title;
    };

    const renderChatMenu = (s) => (
        <div className="session-options-menu glass" onClick={e => e.stopPropagation()}>
            {(sessions || []).length > 1 && (
                <>
                    <div className="menu-item delete" onClick={() => { setDeleteConfirmId(s.id); setActiveMenuId(null); }}>
                        <Trash2 size={14} />
                        <span>删除对话</span>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>智能助手</h2>
                    <button className="mobile-close" onClick={closeSidebar}>
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-nav">
                    <div className="nav-item" onClick={() => { setShowSearch(false); onNewSession(); }}>
                        <Plus size={18} />
                        <span>新聊天</span>
                    </div>
                    <div className={`nav-item ${showSearch ? 'active' : ''}`} onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}>
                        <Search size={18} />
                        <span>搜索聊天</span>
                    </div>
                </div>

                {/* Search Panel */}
                {showSearch && (
                    <div className="search-panel">
                        <p className="search-hint">请输入您需要查找的聊天关键词</p>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="搜索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="search-results">
                            {searchQuery.trim() && searchResults.length === 0 && (
                                <p className="no-results">未找到匹配的聊天</p>
                            )}
                            {searchResults.map(s => (
                                <div
                                    key={s.id}
                                    className={`history-item ${currentSession?.id === s.id ? 'active' : ''}`}
                                    onClick={() => { onSelectSession(s); setShowSearch(false); }}
                                >
                                    <div className="history-item-content">
                                        <span className="history-item-title">{s.title || '无标题'}</span>
                                        <div className="history-item-snippet">
                                            <span className="snippet-text">{getSnippet(s.title)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="section-divider"></div>

                <div className="sidebar-content">
                    <div className="chats-section">
                        <div className="chats-section-header">
                            <span>你的聊天</span>
                        </div>
                        <div className="chat-list">
                            {displayedSessions.map(s => (
                                <div
                                    key={s.id}
                                    className={`history-item ${currentSession?.id === s.id ? 'active' : ''}`}
                                    onClick={() => onSelectSession(s)}
                                >
                                    <div className="history-item-content">
                                        <span className="history-item-title">{s.title || '无标题'}</span>
                                        <div className="history-item-snippet">
                                            <span className="snippet-text">{getSnippet(s.title)}</span>
                                        </div>
                                    </div>
                                    <div className="item-options" onClick={(e) => toggleMenu(e, s.id)}>
                                        <MoreHorizontal size={14} />
                                        {activeMenuId === s.id && renderChatMenu(s)}
                                    </div>
                                </div>
                            ))}
                            {allSessions.length > 10 && (
                                <div className="load-more-items" onClick={() => setShowMore(!showMore)}>
                                    <MoreHorizontal size={16} className="more-icon" />
                                    <span>{showMore ? '收起' : '展示更多'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </aside>

            {/* Deletion confirmation modal */}
            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="confirm-modal glass" onClick={e => e.stopPropagation()}>
                        <h3>是否要删除该对话？</h3>
                        <p>删除后将无法找回！</p>
                        <div className="modal-actions">
                            <button className="confirm-btn" onClick={() => handleDeleteSession(deleteConfirmId)}>是的</button>
                            <button className="cancel-btn" onClick={() => setDeleteConfirmId(null)}>不用了</button>
                        </div>
                    </div>
                </div>
            )}
            <div className={`sidebar-overlay ${isOpen ? 'block' : 'hidden'}`} onClick={closeSidebar}></div>
        </>
    );
};

export default Sidebar;
