import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await api.me();
        setUser(userData);
      } catch (err) {
        // Try to refresh token
        try {
          const refreshRes = await api.refresh();
          if (refreshRes.user) {
            setUser(refreshRes.user);
          } else {
            setUser(null);
          }
        } catch (refreshErr) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function login(data) {
    const loginRes = await api.login(data);
    setUser(loginRes.user);
    return loginRes;
  }

  async function register(data) {
    const registerRes = await api.register(data);
    setUser(registerRes.user);
    return registerRes;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }

  async function logoutAll() {
    try {
      await api.logoutAll();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
