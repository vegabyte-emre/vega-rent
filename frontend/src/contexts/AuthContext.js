import getApiUrl from '../config/api';
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Giriş başarısız",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(newUser);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Kayıt başarısız",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === "superadmin",
    isFirmaAdmin: user?.role === "firma_admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
