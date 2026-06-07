import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens, getAccessToken, listProjects, login as apiLogin, logout as apiLogout, me } from '../api/client';

const PROJECT_KEY = 'bcim_selected_project';
const AuthContext = createContext(null);

function canUseAllProjects(user) {
  return ['super_admin', 'admin', 'director', 'management'].includes(user?.role);
}

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProjectState] = useState(null);

  async function loadProjectContext(nextUser) {
    const allProjects = await listProjects();
    setProjects(allProjects);

    const saved = await AsyncStorage.getItem(PROJECT_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    const stillAllowed = parsed && allProjects.some((p) => p.id === parsed.id);
    if (stillAllowed) {
      setSelectedProjectState(parsed);
    } else if (canUseAllProjects(nextUser)) {
      setSelectedProjectState({ id: 'all', name: 'All Projects', project_code: 'GLOBAL' });
    } else {
      setSelectedProjectState(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const currentUser = await me();
        setUser(currentUser);
        await loadProjectContext(currentUser);
      } catch (_) {
        await clearTokens();
        await AsyncStorage.removeItem(PROJECT_KEY);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function signIn(email, password) {
    const result = await apiLogin(email, password);
    setUser(result.user);
    await AsyncStorage.removeItem(PROJECT_KEY);
    setSelectedProjectState(null);
    await loadProjectContext(result.user);
  }

  async function signOut() {
    await apiLogout();
    await AsyncStorage.removeItem(PROJECT_KEY);
    setUser(null);
    setProjects([]);
    setSelectedProjectState(null);
  }

  async function selectProject(project) {
    await AsyncStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    setSelectedProjectState(project);
  }

  function switchProject() {
    setSelectedProjectState(null);
  }

  const value = useMemo(() => ({
    booting,
    user,
    projects,
    selectedProject,
    signIn,
    signOut,
    selectProject,
    switchProject,
    canUseAllProjects: canUseAllProjects(user)
  }), [booting, user, projects, selectedProject]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
