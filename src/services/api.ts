/**
 * API Service Layer
 *
 * Centralized API communication service that handles:
 * - Base URL configuration from environment variables
 * - Authentication headers (X-User-Id, X-User-Roles)
 * - Request/response interceptors
 * - Error handling
 *
 * Usage:
 * import { apiClient } from '@/services/api'
 * const properties = await apiClient.properties.getAll()
 *
 * Environment Variables:
 * - VITE_API_BASE_URL: Backend API base URL (e.g., http://localhost:8080)
 * - VITE_API_VERSION: API version path (default: v1)
 */

import type {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  ApprovePropertyRequest,
  PropertyType,
  User,
  VerificationRequest,
} from "@/types"

// Configuration from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
const API_VERSION = import.meta.env.VITE_API_VERSION || "v1"
const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_STORAGE_KEY || "derent5_auth_token"
const USER_DATA_KEY = import.meta.env.VITE_USER_STORAGE_KEY || "derent5_user_data"

/**
 * Get authentication headers
 * Used for all API requests that require user context
 */
function getAuthHeaders(): Record<string, string> {
  const userData = localStorage.getItem(USER_DATA_KEY)

  if (!userData) {
    return {}
  }

  try {
    const user = JSON.parse(userData)
    const token = localStorage.getItem(AUTH_TOKEN_KEY)

    return {
      "X-User-Id": user.id || "",
      "X-User-Roles": (user.roles || []).join(","),
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  } catch (error) {
    console.error("[v0] Failed to parse user data:", error)
    return {}
  }
}

/**
 * Build full URL with base and version
 */
function buildUrl(path: string): string {
  const basePath = `/api/${API_VERSION}`
  return `${API_BASE_URL}${basePath}${path}`
}

/**
 * Generic fetch wrapper with error handling
 */
async function request<T>(path: string, options: RequestInit & { requiresAuth?: boolean } = {}): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(requiresAuth && getAuthHeaders()),
    ...fetchOptions.headers,
  }

  const url = buildUrl(path)
  console.log("[v0] API Request:", { method: fetchOptions.method || "GET", url })

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] API Error:", { status: response.status, error: errorData })
      throw new Error(errorData.message || `API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] API Response:", { status: response.status, data })
    return data
  } catch (error) {
    console.error("[v0] Request failed:", error)
    throw error
  }
}

/**
 * Multipart form data request for file uploads
 */
async function requestFormData<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> & { requiresAuth?: boolean } = {},
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options

  const headers: HeadersInit = {
    ...(requiresAuth && getAuthHeaders()),
    ...fetchOptions.headers,
  }

  // Don't set Content-Type for FormData - browser will set it with boundary
  delete (headers as any)["Content-Type"]

  const url = buildUrl(path)
  console.log("[v0] FormData Request:", { method: "POST", url })

  try {
    const response = await fetch(url, {
      method: "POST",
      ...fetchOptions,
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] FormData Error:", { status: response.status, error: errorData })
      throw new Error(errorData.message || `API Error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] FormData request failed:", error)
    throw error
  }
}

/**
 * API Client - Organized by resource
 */
export const apiClient = {
  // ==================== PROPERTIES ====================
  properties: {
    /**
     * Get all properties
     * Note: Implement pagination on backend if needed
     */
    async getAll(): Promise<Property[]> {
      return request("/properties", { requiresAuth: false })
    },

    /**
     * Get property by ID
     */
    async getById(id: string): Promise<Property> {
      return request(`/properties/${id}`, { requiresAuth: false })
    },

    /**
     * Create new property with images
     * @param data Property data
     * @param images Array of File objects
     */
    async create(data: CreatePropertyRequest, images: File[]): Promise<{ id: string }> {
      const formData = new FormData()
      formData.append("input", JSON.stringify(data))

      images.forEach((file, index) => {
        formData.append(`images[${index}]`, file)
      })

      return requestFormData("/properties", formData, { method: "POST" })
    },

    /**
     * Update property details
     */
    async update(id: string, data: UpdatePropertyRequest): Promise<{ success: boolean }> {
      return request(`/properties/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        requiresAuth: true,
      })
    },

    /**
     * Delete property (POSTER only)
     */
    async delete(id: string): Promise<{ success: boolean }> {
      return request(`/properties/${id}`, {
        method: "DELETE",
        requiresAuth: true,
      })
    },

    /**
     * Approve property (ADMIN only)
     */
    async approve(id: string, isApproved: boolean): Promise<{ success: boolean }> {
      return request(`/properties/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ isApproved } as ApprovePropertyRequest),
        requiresAuth: true,
      })
    },

    /**
     * Hide property
     */
    async hide(id: string, isHidden: boolean): Promise<{ success: boolean }> {
      return request(`/properties/${id}/hide`, {
        method: "PATCH",
        body: JSON.stringify({ isHidden }),
        requiresAuth: true,
      })
    },

    /**
     * Suspend property (ADMIN only)
     */
    async suspend(id: string, reason: string): Promise<{ success: boolean }> {
      return request(`/properties/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
        requiresAuth: true,
      })
    },

    /**
     * Revoke suspension (ADMIN only)
     */
    async revokeSuspension(id: string): Promise<{ success: boolean }> {
      return request(`/properties/${id}/revoke-suspension`, {
        method: "PATCH",
        requiresAuth: true,
      })
    },
  },

  // ==================== VERIFICATION REQUESTS ====================
  verificationRequests: {
    /**
     * Get all verification requests (ADMIN)
     */
    async getAll(): Promise<VerificationRequest[]> {
      return request("/verification-requests")
    },

    /**
     * Get verification requests by status
     */
    async getByStatus(status: string): Promise<VerificationRequest[]> {
      return request(`/verification-requests/by-status/${status}`)
    },

    /**
     * Get verification requests for a property
     */
    async getByProperty(propertyId: string): Promise<VerificationRequest[]> {
      return request(`/verification-requests/by-property/${propertyId}`)
    },

    /**
     * Create verification request for property
     */
    async create(propertyId: string, description: string): Promise<{ id: number }> {
      return request("/verification-requests", {
        method: "POST",
        body: JSON.stringify({
          propertyId,
          description,
        }),
      })
    },

    /**
     * Approve verification request (ADMIN)
     */
    async approve(id: number): Promise<{ success: boolean }> {
      return request(`/verification-requests/${id}/approve`, {
        method: "PATCH",
      })
    },

    /**
     * Reject verification request (ADMIN)
     */
    async reject(id: number, reason: string): Promise<{ success: boolean }> {
      return request(`/verification-requests/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      })
    },

    /**
     * Cancel verification request
     */
    async cancel(id: number): Promise<{ success: boolean }> {
      return request(`/verification-requests/${id}`, {
        method: "DELETE",
      })
    },
  },

  // ==================== PROPERTY TYPES ====================
  propertyTypes: {
    /**
     * Get all property types
     */
    async getAll(): Promise<PropertyType[]> {
      return request("/property-types", { requiresAuth: false })
    },

    /**
     * Get property type by ID
     */
    async getById(id: number): Promise<PropertyType> {
      return request(`/property-types/${id}`, { requiresAuth: false })
    },

    /**
     * Create property type (ADMIN)
     */
    async create(type: string): Promise<PropertyType> {
      return request("/property-types", {
        method: "POST",
        body: JSON.stringify({ type }),
      })
    },

    /**
     * Update property type (ADMIN)
     */
    async update(id: number, type: string): Promise<PropertyType> {
      return request(`/property-types/${id}`, {
        method: "PUT",
        body: JSON.stringify({ type }),
      })
    },

    /**
     * Delete property type (ADMIN)
     */
    async delete(id: number): Promise<{ success: boolean }> {
      return request(`/property-types/${id}`, {
        method: "DELETE",
      })
    },
  },

  // ==================== AMENITIES ====================
  amenities: {
    /**
     * Create amenity (ADMIN)
     */
    async create(name: string, categoryId?: number, icon?: File): Promise<{ id: number }> {
      const formData = new FormData()
      formData.append(
        "input",
        JSON.stringify({
          amenityName: name,
          categoryId,
        }),
      )

      if (icon) {
        formData.append("amenityIcon", icon)
      }

      return requestFormData("/amenities", formData, {
        method: "POST",
      })
    },

    /**
     * Update amenity (ADMIN)
     */
    async update(id: number, name: string, icon?: File): Promise<{ success: boolean }> {
      const formData = new FormData()
      formData.append(
        "input",
        JSON.stringify({
          amenityName: name,
        }),
      )

      if (icon) {
        formData.append("amenityIcon", icon)
      }

      return requestFormData(`/amenities/${id}`, formData, {
        method: "PUT",
      })
    },

    /**
     * Delete amenity (ADMIN)
     */
    async delete(id: number): Promise<{ success: boolean }> {
      return request(`/amenities/${id}`, {
        method: "DELETE",
      })
    },
  },

  // ==================== AUTHENTICATION ====================
  auth: {
    /**
     * Store auth token and user data
     */
    setAuth(token: string, user: User): void {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
    },

    /**
     * Get current auth token
     */
    getToken(): string | null {
      return localStorage.getItem(AUTH_TOKEN_KEY)
    },

    /**
     * Get current user data
     */
    getUser(): User | null {
      const userData = localStorage.getItem(USER_DATA_KEY)
      return userData ? JSON.parse(userData) : null
    },

    /**
     * Clear authentication
     */
    clearAuth(): void {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(USER_DATA_KEY)
    },

    /**
     * Check if user has role
     */
    hasRole(role: string): boolean {
      const user = this.getUser()
      return user?.roles.includes(role as any) ?? false
    },
  },
}

// Export for convenience
export const apiBaseUrl = API_BASE_URL
export const apiVersion = API_VERSION
