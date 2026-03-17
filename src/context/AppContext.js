import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('waf_lang') || 'en');
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('waf_access');
    if (token) {
      api.get('/auth/me/')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('waf_access'); localStorage.removeItem('waf_refresh'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // RTL toggle
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('waf_lang', lang);
  }, [lang]);

  const login = useCallback((userData, tokens) => {
    localStorage.setItem('waf_access', tokens.access);
    localStorage.setItem('waf_refresh', tokens.refresh);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('waf_access');
    localStorage.removeItem('waf_refresh');
    setUser(null);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(l => l === 'en' ? 'ar' : 'en');
  }, []);

  return (
    <AppContext.Provider value={{ user, lang, loading, login, logout, toggleLang }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
