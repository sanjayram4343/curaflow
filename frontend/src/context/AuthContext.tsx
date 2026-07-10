import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Hospital Admin' | 'Doctor' | 'Nurse' | 'Reception Staff';
  hospital?: {
    _id: string;
    name: string;
  };
  department?: {
    _id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
  activeDoctor: User | null;
  activeNurse: User | null;
  selectDoctor: (doctor: User | null) => void;
  selectNurse: (nurse: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeDoctor, setActiveDoctor] = useState<User | null>(null);
  const [activeNurse, setActiveNurse] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('hosp_token');
      if (token) {
        try {
          const profile = await api.get('/auth/profile');
          setUser(profile);
          
          // Restore selected subprofile if applicable
          const savedDoc = localStorage.getItem('active_doctor');
          if (savedDoc) {
            try { setActiveDoctor(JSON.parse(savedDoc)); } catch {}
          }
          const savedNurse = localStorage.getItem('active_nurse');
          if (savedNurse) {
            try { setActiveNurse(JSON.parse(savedNurse)); } catch {}
          }
        } catch (error) {
          console.error('Failed to restore auth session:', error);
          localStorage.removeItem('hosp_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('hosp_token', data.token);
      
      const loggedInUser: User = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        hospital: data.hospital,
        department: data.department
      };
      
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('hosp_token');
    localStorage.removeItem('active_doctor');
    localStorage.removeItem('active_nurse');
    setUser(null);
    setActiveDoctor(null);
    setActiveNurse(null);
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const selectDoctor = (doctor: User | null) => {
    setActiveDoctor(doctor);
    if (doctor) {
      localStorage.setItem('active_doctor', JSON.stringify(doctor));
    } else {
      localStorage.removeItem('active_doctor');
    }
  };

  const selectNurse = (nurse: User | null) => {
    setActiveNurse(nurse);
    if (nurse) {
      localStorage.setItem('active_nurse', JSON.stringify(nurse));
    } else {
      localStorage.removeItem('active_nurse');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        activeDoctor,
        activeNurse,
        selectDoctor,
        selectNurse
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export type { User };
