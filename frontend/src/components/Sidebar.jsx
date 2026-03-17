import React, { useState } from 'react';
import {
    Plus, MessageSquare, Moon, Sun, X,
    FileSpreadsheet, Search, Folder, MoreHorizontal, ChevronRight, ChevronDown
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({
    isOpen, closeSidebar, toggleTheme, theme,
    sessions, currentSession, onSelectSession, onNewSession,
    projects, onNewProject, onSelectProject, currentProject
}) => {
    const fileInputRef = React.useRef(null);
    const [uploading, setUploading] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState({});
    const [movingSessionId, setMovingSessionId] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Auto-expand current session's project
    React.useEffect(() => {
        if (currentSession?.project_id) {
            setExpandedProjects(prev => ({
                ...prev,
                [currentSession.project_id]: true
            }));
        }
    }, [currentSession]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleMoveSession = async (sessionId, projectId) => {
        try {
            const { moveSession } = await import('../api/client');
            await moveSession(sessionId, projectId);
            window.location.reload();
        } catch (e) {
            alert("移动会话失败");
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const { uploadFile } = await import('../api/client');
            await uploadFile(file);
            alert(`上传成功: ${file.name}`);
        } catch (error) {
            alert(`上传失败: ${file.name}`);
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const toggleProject = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    // Filter sessions not in any project for "Your Chats"
    const generalSessions = sessions.filter(s => !s.project_id);
    const displayedSessions = showMore ? generalSessions.slice(0, 5) : generalSessions.slice(0, 3);

    // Search results
    const searchResults = searchQuery.trim()
        ? sessions.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getSnippet = (title) => {
        if (!title) return '无内容';
        return title.length > 20 ? title.substring(0, 20) : title;
    };

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>QA Assistant</h2>
                    <button className="mobile-close" onClick={closeSidebar}>
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-nav">
                    <div className="nav-item" onClick={() => { setShowSearch(false); onNewSession(null); }}>
                        <Plus size={18} />
                        <span>新聊天</span>
                    </div>
                    <div className="nav-item ${showSearch ? 'active' : ''}" onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}>
                        <Search size={18} />
                        <span>搜索聊天</span>
                    </div>
                    <div className="nav-item">
                        <Folder size={18} />
                        <span>我的项目</span>
                    </div>
                    <div className="nav-item ${!showSearch && !currentSession?.project_id ? 'active' : ''}">
                        <MessageSquare size={18} />
                        <span>你的聊天</span>
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
                                            <span className="snippet-time">{formatTime(s.created_at)}</span>
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
                        <div className="projects-section-header">
                            <span>我的项目</span>
                            <Plus size={16} className="add-project-btn" onClick={onNewProject} />
                        </div>
                        <div className="project-list">
                            {projects.map(project => (
                                <div key={project.id} className="project-item">
                                    <div className="project-folder" onClick={() => toggleProject(project.id)}>
                                        {expandedProjects[project.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <Folder size={16} />
                                        <span>{project.name}</span>
                                    </div>
                                    {expandedProjects[project.id] && (
                                        <div className="project-chats">
                                            {sessions.filter(s => s.project_id === project.id).map(s => (
                                                <div
                                                    key={s.id}
                                                    className={`history-item ${currentSession?.id === s.id ? 'active' : ''}`}
                                                    onClick={() => onSelectSession(s)}
                                                >
                                                    <div className="history-item-content">
                                                        <span className="history-item-title">{s.title || '无标题'}</span>
                                                        <div className="history-item-snippet">
                                                            <span className="snippet-text">{getSnippet(s.title)}</span>
                                                            <span className="snippet-time">{formatTime(s.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="nav-item" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => onNewSession(project.id)}>
                                                <Plus size={14} />
                                                <span>开始新对话</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chats-section">
                        <div className="chats-section-header">
                            <span>你的聊天</span>
                            <MoreHorizontal size={16} className="more-icon" onClick={() => setShowMore(!showMore)} />
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
                                            <span className="snippet-time">{formatTime(s.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="move-action" title="移动到项目" onClick={(e) => {
                                        e.stopPropagation();
                                        setMovingSessionId(movingSessionId === s.id ? null : s.id);
                                    }}>
                                        <Folder size={14} />
                                    </div>
                                    {movingSessionId === s.id && (
                                        <div className="project-dropdown glass" onClick={(e) => e.stopPropagation()}>
                                            <p className="dropdown-label">移动至:</p>
                                            {projects.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="dropdown-item"
                                                    onClick={() => handleMoveSession(s.id, p.id)}
                                                >
                                                    {p.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx,.pdf,.docx,.doc"
                        onChange={handleFileChange}
                    />
                    <button className="footer-btn" onClick={handleUploadClick} disabled={uploading}>
                        <FileSpreadsheet size={18} />
                        <span>{uploading ? '正在上传...' : '上传文件'}</span>
                    </button>
                    <button className="footer-btn" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
                    </button>
                </div>
            </aside>
            <div className={`sidebar-overlay ${isOpen ? 'block' : 'hidden'}`} onClick={closeSidebar}></div>
        </>
    );
};

export default Sidebar;
