import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Student } from '@/types';
import { mockUsers, mockStudents } from '@/data/mockData';

interface AuthContextType {
  user: User | Student | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loginAsRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'sit_portal_users';
const SESSION_KEY = 'sit_portal_session';

// Load users from localStorage or use mock data
const getAllUsers = (): (User | Student)[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const storedUsers = JSON.parse(stored);
      // Merge with mock data, giving priority to stored users (avoid duplicates by email)
      const allMockUsers = [...mockUsers, ...mockStudents];
      const mockEmails = new Set(allMockUsers.map(u => u.email));
      const newStoredUsers = storedUsers.filter((u: User | Student) => !mockEmails.has(u.email));
      return [...allMockUsers, ...newStoredUsers];
    }
  } catch (error) {
    console.error('Error loading users from localStorage:', error);
  }
  return [...mockUsers, ...mockStudents];
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Load user from session on mount
  const [user, setUser] = useState<User | Student | null>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const sessionData = JSON.parse(session);
        // Verify user still exists in the system
        const allUsers = getAllUsers();
        const foundUser = allUsers.find(u => u.id === sessionData.userId);
        if (foundUser) {
          return foundUser;
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
    return null;
  });

  // Save session when user changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, email: user.email }));
      } catch (error) {
        console.error('Error saving session:', error);
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Input validation
    if (!email || !email.trim()) {
      return false;
    }
    
    if (!password || !password.trim()) {
      return false;
    }

    // Email format validation - Gmail format with dots allowed in username, but must end exactly with @gmail.com
    const emailRegex = /^[a-zA-Z0-9.]+@gmail\.com$/;
    if (!emailRegex.test(email.trim())) {
      return false;
    }

    // Get all users (from localStorage + mock data)
    const allUsers = getAllUsers();
    
    // Find user by email (case-insensitive)
    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (foundUser) {
      // Check if user has a password set (admin-created users will have password)
      if ((foundUser as User).password) {
        // Validate password for admin-created users (exact match)
        if ((foundUser as User).password === password) {
          setUser(foundUser);
          return true;
        }
        return false; // Password doesn't match
      } else {
        // For mock users without password, allow login with any password (backward compatibility)
        // But still require password to be provided
        if (password.trim().length > 0) {
          setUser(foundUser);
          return true;
        }
        return false;
      }
    }
    return false; // User not found
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const loginAsRole = useCallback((role: UserRole) => {
    // Quick login for demo purposes
    if (role === 'student') {
      setUser(mockStudents[0]);
    } else {
      const foundUser = mockUsers.find(u => u.role === role);
      if (foundUser) {
        setUser(foundUser);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loginAsRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
