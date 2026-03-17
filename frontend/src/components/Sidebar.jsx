import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, MessageSquare, Moon, Sun, X,
    FileSpreadsheet, Search, Folder, FolderPlus, MoreHorizontal, ChevronRight, ChevronDown, Trash2, ArrowRight, FileText
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({
    isOpen, closeSidebar,
    sessions, currentSession, onSelectSession, onNewSession,
    projects, onNewProject, onSelectProject, currentProject
}) => {
    const [showMore, setShowMore] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState({});
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

    // Auto-expand current session's project
    useEffect(() => {
        if (currentSession?.project_id) {
            setExpandedProjects(prev => ({
                ...prev,
                [currentSession.project_id]: true
            }));
        }
    }, [currentSession]);


    const handleMoveSession = async (sessionId, projectId) => {
        try {
            const client = await import('../api/client');
            await client.moveSession(sessionId, projectId);
            setActiveMenuId(null);
            window.location.reload(); // Temporary measure; ideal would be state sync
        } catch (e) {
            alert("移动会话失败");
        }
    };

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


    const toggleProject = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    // Filter sessions not in any project for "Your Chats"
    const generalSessions = sessions.filter(s => !s.project_id);
    const displayedSessions = showMore ? generalSessions : generalSessions.slice(0, 5);

    // Search results
    const searchResults = searchQuery.trim()
        ? sessions.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : [];


    const getSnippet = (title) => {
        if (!title) return '无内容';
        return title.length > 20 ? title.substring(0, 20) : title;
    };

    const renderChatMenu = (s) => (
        <div className="session-options-menu glass" onClick={e => e.stopPropagation()}>
            {sessions.length > 1 && (
                <>
                    <div className="menu-item delete" onClick={() => { setDeleteConfirmId(s.id); setActiveMenuId(null); }}>
                        <Trash2 size={14} />
                        <span>删除对话</span>
                    </div>
                    <div className="menu-divider"></div>
                </>
            )}
            <div className="menu-label">移动至项目:</div>
            {projects.map(p => (
                <div key={p.id} className="menu-item" onClick={() => handleMoveSession(s.id, p.id)}>
                    <ArrowRight size={14} />
                    <span>{p.name}</span>
                </div>
            ))}
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
                    <div className="nav-item" onClick={() => { setShowSearch(false); onNewSession(null); }}>
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
                    {/* My Projects Section */}
                    <div className="projects-section">
                        <div className="projects-section-header" onClick={() => setIsProjectsExpanded(!isProjectsExpanded)} style={{ cursor: 'pointer' }}>
                            <div className="flex items-center gap-1">
                                {isProjectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span className="root-path">/root/projects/</span>
                            </div>
                        </div>
                        {isProjectsExpanded && (
                            <div className="project-list">
                                <div className="nav-item new-project-nav" onClick={onNewProject} style={{ fontFamily: 'monospace' }}>
                                    <FolderPlus size={18} />
                                    <span>$ create_new_project</span>
                                </div>
                                {projects && projects.length > 0 ? projects.map(project => (
                                    <div key={project.id} className="project-group">
                                        <div
                                            className={`project-folder ${currentProject?.id === project.id ? 'active' : ''}`}
                                            onClick={() => onSelectProject(project)}
                                            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                        >
                                            <span className="project-path">~/projects/</span>
                                            <span className="project-name">{project.name}</span>
                                        </div>
                                        <div className="project-relative-chats">
                                            {sessions.filter(s => s.project_id === project.id).map(s => (
                                                <div
                                                    key={s.id}
                                                    className={`history-item relative-item ${currentSession?.id === s.id ? 'active' : ''}`}
                                                    onClick={() => onSelectSession(s)}
                                                >
                                                    <div className="tree-leaf"></div>
                                                    <FileText size={12} className="rel-icon" />
                                                    <span className="history-item-title">{s.title || 'untitled'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="empty-hint">暂无项目</p>
                                )}
                            </div>
                        )}
                    </div>

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
                            {generalSessions.length > 5 && (
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
