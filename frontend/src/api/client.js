import axios from 'axios';

// Use the environment variable for production URL, fallback to local URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rag-agent-repository-1.onrender.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const fetchSessions = (projectId = null) =>
    api.get('/sessions', { params: { project_id: projectId } }).then(res => res.data);

export const createSession = (title, projectId = null) =>
    api.post('/sessions', { title, project_id: projectId }).then(res => res.data);

export const fetchMessages = (sessionId) => api.get(`/sessions/${sessionId}/messages`).then(res => res.data);

export const sendChat = (sessionId, message, useSearch, useRag) =>
    api.post('/chat', { session_id: sessionId, message, use_search: useSearch, use_rag: useRag }).then(res => res.data);

export const uploadFile = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData).then(res => res.data);
}

export const fetchProjects = () => api.get('/projects').then(res => res.data);

export const createProject = (name, description = "") =>
    api.post('/projects', { name, description }).then(res => res.data);

export const deleteProject = (projectId) => api.delete(`/projects/${projectId}`).then(res => res.data);

export const moveSession = (sessionId, projectId) =>
    api.post(`/sessions/${sessionId}/move`, { project_id: projectId }).then(res => res.data);

export const clearMessages = (sessionId) =>
    api.delete(`/sessions/${sessionId}/messages`).then(res => res.data);

export const submitFeedback = async (sessionId, content, rating, comment = "") => {
    const resp = await api.post('/feedback', { session_id: sessionId, message_content: content, rating, comment });
    return resp.data;
};

export const deleteSession = async (sessionId) => {
    const resp = await api.delete(`/sessions/${sessionId}`);
    return resp.data;
};
