import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { fetchSessions, createSession, fetchProjects, createProject } from './api/client';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

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
      // 1. Load Sessions
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

  const handleNewSession = async () => {
    try {
      const title = "新对话";
      const newSess = await createSession(title);
      if (newSess) {
        setSessions(prev => [newSess, ...(prev || [])]);
        setCurrentSession(newSess);
      }
    } catch (e) {
      console.error("Could not create session", e);
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
        currentSession={currentSession}
        onSelectSession={(s) => { setCurrentSession(s); }}
        onNewSession={handleNewSession}
      />
      <ChatArea
        toggleSidebar={toggleSidebar}
        currentSession={currentSession}
        sessions={sessions || []}
        onSelectSession={(s) => { setCurrentSession(s); }}
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
