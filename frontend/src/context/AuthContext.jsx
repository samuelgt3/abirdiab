import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    authApi.getCurrentUser().then((u) => { if (u) setUser(u); });
  }, []);

  const signIn = useCallback(async (email, password) => {
    const u = await authApi.login({ email, password });
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    const u = await authApi.signup({ name, email, password });
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
