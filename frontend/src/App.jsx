import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { fetchSessions, createSession, fetchProjects, createProject } from './api/client';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    // 1. Initial theme from system preference or default 'dark'
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = localStorage.getItem('theme') || systemTheme;
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Load Projects
      const projectData = await fetchProjects();
      setProjects(projectData || []);

      // 2. Load General Sessions
      const sessionData = await fetchSessions();
      setSessions(sessionData || []);

      if (sessionData && sessionData.length > 0) {
        setCurrentSession(sessionData[0]);
      } else {
        handleNewSession(null); // Create initial general chat
      }
    } catch (e) {
      console.error("Could not load initial data", e);
      handleNewSession(null);
    }
  }

  const handleNewSession = async (projectId = null) => {
    try {
      const title = "新对话";
      const newSess = await createSession(title, projectId);
      if (newSess) {
        setSessions(prev => [newSess, ...(prev || [])]);
        setCurrentSession(newSess);
      }
    } catch (e) {
      console.error("Could not create session", e);
    }
  }

  const handleNewProject = async () => {
    const name = prompt("请输入项目名称:");
    if (!name) return;
    try {
      const newProj = await createProject(name);
      if (newProj) {
        setProjects(prev => [newProj, ...prev]);
      }
    } catch (e) {
      console.error("Could not create project", e);
    }
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-container">
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
        sessions={sessions || []}
        projects={projects || []}
        currentSession={currentSession}
        currentProject={currentProject}
        onSelectSession={(s) => { setCurrentSession(s); setCurrentProject(null); }}
        onNewSession={handleNewSession}
        onNewProject={handleNewProject}
        onSelectProject={(p) => { setCurrentProject(p); setCurrentSession(null); }}
      />
      <ChatArea
        toggleSidebar={toggleSidebar}
        currentSession={currentSession}
        currentProject={currentProject}
        sessions={sessions || []}
        onSelectSession={(s) => { setCurrentSession(s); setCurrentProject(null); }}
        onNewSession={handleNewSession}
        onSessionUpdate={(updatedSess) => {
          if (!updatedSess) return;
          setSessions(prev => (prev || []).map(s => (s && s.id === updatedSess.id) ? updatedSess : s));
          if (currentSession?.id === updatedSess.id) {
            setCurrentSession(updatedSess);
          }
        }}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    </div>
  );
}

export default App;
