"use client"

import { useState, useEffect, useContext, createContext } from "react"
import type { User, UserRole } from "@/lib/types"
import { mockUsers } from "@/lib/mock-data"
import { apiClient } from "@/lib/services/api"

const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || "derent5_auth_token"
const USER_DATA_KEY = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data"

export interface UseAuthReturn {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (role: UserRole) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<UseAuthReturn | null>(null)

/**
 * useAuth hook - Get current user and authentication state
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      const storedUser = localStorage.getItem(USER_DATA_KEY) || localStorage.getItem("user")
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem("token")

      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser))
          setToken(storedToken)
        } catch (error) {
          console.error("Failed to parse stored user:", error)
        }
      } else {
        setUser(null)
        setToken(null)
      }
    }

    // Load initial state
    loadAuthState()
    setIsLoading(false)

    // Listen for storage changes (when login/logout happens in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_DATA_KEY || e.key === AUTH_TOKEN_KEY || e.key === "user" || e.key === "token") {
        loadAuthState()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadAuthState()
    }

    window.addEventListener("auth-state-changed", handleCustomStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("auth-state-changed", handleCustomStorageChange)
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Try real API first
      const response = await apiClient.auth.login(email, password)
      
      // Store token
      const token = response.token
      localStorage.setItem("token", token)
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      
      // Decode JWT to get userId and roles
      const tokenParts = token.split(".")
      let userId = ""
      let roles: UserRole[] = ["USER"]
      
      try {
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")))
          userId = payload.sub || payload.subject || ""
          // Roles are in extraClaims.roles array
          if (payload.roles && Array.isArray(payload.roles)) {
            roles = payload.roles.map((r: string) => {
              // Map backend roles to frontend roles
              if (r === "HOST") return "POSTER"
              if (r === "TENANT") return "USER"
              if (r === "ADMIN") return "ADMIN"
              return r as UserRole
            })
          }
        }
      } catch (decodeError) {
        console.error("Failed to decode JWT:", decodeError)
      }
      
      // Fetch full user data from /api/v1/users/me
      try {
        const userData = await apiClient.users.getMe()
        
        // Use roles from API if available, otherwise use roles from JWT
        let finalRoles = roles
        if (userData.roles && userData.roles.length > 0) {
          finalRoles = userData.roles.map((r: string) => {
            if (r === "HOST") return "POSTER"
            if (r === "TENANT") return "USER"
            if (r === "ADMIN") return "ADMIN"
            return r as UserRole
          })
        }
        
        const fullUser: User = {
          id: userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber?.toString(),
          birthday: userData.birthday,
          profileImage: userData.profilePicture,
          roles: finalRoles,
          verified: true, // If user can login, they are verified
          walletAddress: userData.walletAddress || undefined, // Add walletAddress from API
        }
        
        localStorage.setItem("user", JSON.stringify(fullUser))
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(fullUser))
        setUser(fullUser)
      } catch (userError) {
        // If /users/me fails, use basic user data
        console.warn("Failed to fetch user data, using basic info:", userError)
        const basicUser: User = {
          id: userId,
          email: email,
          firstName: "",
          lastName: "",
          roles: roles,
        }
        localStorage.setItem("user", JSON.stringify(basicUser))
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(basicUser))
        setUser(basicUser)
      }
      
      setToken(token)
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event("auth-state-changed"))
    } catch (apiError) {
      // Fallback to mock for development
      let authenticatedUser: User | null = null

      if (email === "admin@example.com") {
        authenticatedUser = mockUsers.admin
      } else if (email === "poster@example.com") {
        authenticatedUser = mockUsers.poster
      } else {
        throw apiError || new Error("Invalid credentials")
      }

      const mockToken = `token-${Date.now()}`
      localStorage.setItem("user", JSON.stringify(authenticatedUser))
      localStorage.setItem("token", mockToken)
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(authenticatedUser))
      localStorage.setItem(AUTH_TOKEN_KEY, mockToken)
      localStorage.setItem("userId", authenticatedUser.id)
      localStorage.setItem("userRoles", JSON.stringify(authenticatedUser.roles))

      setUser(authenticatedUser)
      setToken(mockToken)
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event("auth-state-changed"))
    }
  }

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false
  }

  const logout = (): void => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    localStorage.removeItem(USER_DATA_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem("userId")
    localStorage.removeItem("userRoles")
    setUser(null)
    setToken(null)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("auth-state-changed"))
  }

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    hasRole,
    login,
    logout,
  }
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}
