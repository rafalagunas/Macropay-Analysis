import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada en localStorage
    const savedUser = localStorage.getItem('macroplay_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    // Autenticación mockeada - En producción, esto sería una llamada a API
    if (username && password) {
      const userData = {
        username,
        loginTime: new Date().toISOString()
      };
      setUser(userData);
      localStorage.setItem('macroplay_user', JSON.stringify(userData));
      return { success: true };
    }
    return { success: false, error: 'Usuario y contraseña son requeridos' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('macroplay_user');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

