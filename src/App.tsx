import React, { useState, useEffect } from 'react';
import { Teacher } from './types';
import LoginScreen from './components/LoginScreen';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';

const SESSION_TEACHER_KEY = 'tfc_session_teacher';
const SESSION_TOKEN_KEY = 'tfc_session_token';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Restore session from localStorage on startup
  useEffect(() => {
    try {
      const storedTeacher = localStorage.getItem(SESSION_TEACHER_KEY);
      const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
      
      if (storedTeacher && storedToken) {
        setCurrentUser(JSON.parse(storedTeacher));
        setToken(storedToken);
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (teacher: Teacher, sessionToken: string) => {
    setCurrentUser(teacher);
    setToken(sessionToken);
    localStorage.setItem(SESSION_TEACHER_KEY, JSON.stringify(teacher));
    localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem(SESSION_TEACHER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-4 font-semibold">Waking up assessment portal...</p>
      </div>
    );
  }

  // Session Routing
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.Role === 'Admin') {
    return <AdminDashboard adminUser={currentUser} onLogout={handleLogout} />;
  }

  return <TeacherDashboard teacher={currentUser} onLogout={handleLogout} />;
}
