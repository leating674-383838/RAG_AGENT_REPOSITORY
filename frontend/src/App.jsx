import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { fetchSessions, createSession, fetchProjects, createProject } from './api/client';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    // 1. Initial theme from system preference or default 'dark'
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = localStorage.getItem('theme') || systemTheme;
    setTheme(initialTheme);

    // 2. Handle Device ID for session isolation
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', id);
    }
    setDeviceId(id);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (deviceId) {
      loadInitialData(deviceId);
    }
  }, [deviceId]);

  const loadInitialData = async (did) => {
    try {
      // 1. Load Sessions with device filter
      const sessionData = await fetchSessions(null, did);
      setSessions(sessionData || []);

      if (sessionData && sessionData.length > 0) {
        setCurrentSession(sessionData[0]);
      } else {
        handleNewSession(did); // Create initial general chat
      }
    } catch (e) {
      console.error("Could not load initial data", e);
      handleNewSession(did);
    }
  }

  const handleNewSession = async (overrideDeviceId = null) => {
    try {
      const activeDeviceId = overrideDeviceId || deviceId;
      if (!activeDeviceId) return;

      const title = "新对话";
      const newSess = await createSession(title, null, activeDeviceId);
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
        deviceId={deviceId}
      />
    </div>
  );
}

export default App;
