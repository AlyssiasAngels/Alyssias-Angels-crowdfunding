import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=unknown, false=guest, object=user
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("token");
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      // The /auth/login response is intentionally minimal. Pull the full user
      // profile (kyc_status, identity_verified, bank_details, etc.) via /me
      // so all client-side gates work correctly right from the first render.
      try {
        const me = await api.get("/auth/me");
        setUser(me.data);
        return { ok: true, user: me.data };
      } catch {
        setUser(data.user);
        return { ok: true, user: data.user };
      }
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const register = async (full_name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", { full_name, email, password });
      localStorage.setItem("token", data.token);
      try {
        const me = await api.get("/auth/me");
        setUser(me.data);
        return { ok: true, user: me.data };
      } catch {
        setUser(data.user);
        return { ok: true, user: data.user };
      }
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
