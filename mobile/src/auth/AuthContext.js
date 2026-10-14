import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokens, setLogoutHandler } from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notice, setNotice] = useState('');
  const [lastId, setLastId] = useState('');

  const updateUser = (patch) => setUser((u) => (u ? { ...u, ...patch } : u));

  const logout = useCallback(async () => {
    await tokens.clear();
    setUser(null);
  }, []);


  // On app start: if a token is saved, restore the session
  useEffect(() => {
    setLogoutHandler(logout);
    (async () => {
      const t0 = Date.now();
      try {
        const { access } = await tokens.get();
        if (access) {
          const { data } = await api.get('/me/');
          setUser(data);
        }
      } catch (e) { /* not logged in */ }
      const wait = 1500 - (Date.now() - t0);   // keep splash visible briefly
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setLoading(false);
    })();
  }, [logout]);

  const login = async (employeeId, pin) => {
    const { data } = await api.post('/auth/login/', {
      username: employeeId.trim(),
      password: pin,
    });
    await tokens.set(data.access, data.refresh);
    setUser({ ...data.user, must_change_pin: data.must_change_pin });
  };

  const changePin = async (oldPin, newPin, { relogin = false } = {}) => {
    await api.post('/auth/change-pin/', { old_pin: oldPin, new_pin: newPin });
    if (relogin) {
      setLastId(user?.employee_id || '');
      setNotice('Your PIN was set. Please log in with your new PIN.');
      await logout();
    } else {
      setUser((u) => ({ ...u, must_change_pin: false }));
    }
  };

  return (
        <Ctx.Provider value={{ user, loading, login, logout, changePin, notice, setNotice, lastId, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}