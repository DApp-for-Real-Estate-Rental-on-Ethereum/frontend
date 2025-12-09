"use client"

import { useState, useEffect, useContext, createContext } from "react"
import type { User, UserRole } from "@/types"
import { apiClient } from "@/services/api"

export interface UseAuthReturn {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (role: UserRole) => boolean
  logout: () => void
}

// Create auth context for global access
export const AuthContext = createContext<UseAuthReturn | null>(null)

/**
 * useAuth hook
 *
 * Provides current user and authentication state
 * Usage: const { user, isAuthenticated } = useAuth()
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize auth state from localStorage
    const storedUser = apiClient.auth.getUser()
    const storedToken = apiClient.auth.getToken()

    if (storedUser && storedToken) {
      setUser(storedUser)
      setToken(storedToken)
    }

    setIsLoading(false)
  }, [])

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false
  }

  const logout = (): void => {
    apiClient.auth.clearAuth()
    setUser(null)
    setToken(null)
  }

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    hasRole,
    logout,
  }
}

/**
 * useAuthContext hook
 * Get auth context (must be within AuthProvider)
 */
export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}
