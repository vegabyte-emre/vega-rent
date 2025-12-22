import getApiUrl from '../config/api';
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
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
      const response = await axios.get(`${getApiUrl()}/api/auth/me`);
      setUser(response.data);
      // Fetch company info if user has company_id
      if (response.data.company_id) {
        fetchCompany();
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/company/info`);
      setCompany(response.data);
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/auth/login`, {
        email,
        password,
      });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      // Fetch company after login
      if (userData.company_id) {
        setTimeout(fetchCompany, 100);
      }
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
      const response = await axios.post(`${getApiUrl()}/api/auth/register`, userData);
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
    setCompany(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const value = {
    user,
    company,
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
