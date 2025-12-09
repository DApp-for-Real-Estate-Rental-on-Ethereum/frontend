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
 * import { apiClient } from '@/lib/services/api'
 * const properties = await apiClient.properties.getAll()
 *
 * Environment Variables (in .env.local):
 * - NEXT_PUBLIC_API_BASE_URL: Backend API base URL (e.g., http://localhost:8080)
 * - NEXT_PUBLIC_API_VERSION: API version path (default: v1)
 */

import type {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  ApprovePropertyRequest,
  PropertyType,
  User,
  VerificationRequest,
} from "@/lib/types"

// Configuration from environment variables
// Use API Gateway (port 8090) as the single entry point for all services
// If GATEWAY_URL is not set, fall back to individual service URLs for backward compatibility
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8090"
const USE_GATEWAY = process.env.NEXT_PUBLIC_USE_GATEWAY !== "false" // Default to true

// Fallback URLs for individual services (used if USE_GATEWAY is false)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
const PROPERTY_API_BASE_URL = process.env.NEXT_PUBLIC_PROPERTY_API_BASE_URL || "http://localhost:8081"
const BOOKING_API_BASE_URL = USE_GATEWAY 
  ? GATEWAY_URL 
  : (process.env.NEXT_PUBLIC_BOOKING_API_BASE_URL || "http://localhost:8083")
const PAYMENT_API_BASE_URL = process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL || "http://localhost:8085"
const RECLAMATION_API_BASE_URL = process.env.NEXT_PUBLIC_RECLAMATION_API_BASE_URL || "http://localhost:8091"
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1"
const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || "derent5_auth_token"
const USER_DATA_KEY = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data"
// USE_MOCK_API is true if explicitly set to "true", otherwise false (use real API)
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

// Only import mock API if needed (tree-shake when not used)
let mockApiClient: typeof import("@/lib/mock-api").mockApi | null = null

async function getMockApi() {
  if (!mockApiClient) {
    const { mockApi } = await import("@/lib/mock-api")
    mockApiClient = mockApi
  }
  return mockApiClient
}

/**
 * Decode JWT token to extract userId from subject
 */
function decodeJWT(token: string): { userId?: string; roles?: string[] } | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".")
    if (parts.length !== 3) return null

    // Decode payload (base64url)
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    
    return {
      userId: decoded.sub || decoded.subject, // JWT subject contains userId
      roles: decoded.roles || [],
    }
  } catch (error) {
    return null
  }
}

/**
 * Get authentication headers from localStorage
 * Used for all API requests that require user context
 */
function getAuthHeaders(): Record<string, string> {
  // Only run in browser
  if (typeof window === "undefined") {
    return {}
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) {
    return {}
  }

  // Try to get userId from JWT token first
  const decoded = decodeJWT(token)
  const userId = decoded?.userId

  // Fallback to user data from localStorage
  const userData = localStorage.getItem(USER_DATA_KEY)
  let finalUserId = userId
  let roles: string[] = decoded?.roles || []

  if (userData) {
    try {
      const user = JSON.parse(userData)
      finalUserId = finalUserId || user.id || ""
      roles = roles.length > 0 ? roles : (user.roles || [])
    } catch (error) {
      // Failed to parse user data
    }
  }

  // Ensure userId is always a string (convert number to string if needed)
  const userIdString = finalUserId ? String(finalUserId) : ""

  const headers = {
    "X-User-Id": userIdString,
    "X-User-Roles": roles.join(","),
    ...(token && { Authorization: `Bearer ${token}` }),
  }
  
  return headers
}

/**
 * Helper function to get the correct base URL for a service
 * Uses Gateway if enabled, otherwise falls back to individual service URLs
 */
function getServiceUrl(service: 'auth' | 'users' | 'properties' | 'bookings' | 'payments' | 'reclamations' | 'admin-reclamations'): string {
  if (USE_GATEWAY) {
    // All services go through the Gateway
    return GATEWAY_URL
  }
  
  // Fallback to individual service URLs
  switch (service) {
    case 'auth':
    case 'users':
      return API_BASE_URL
    case 'properties':
      return PROPERTY_API_BASE_URL
    case 'bookings':
      return BOOKING_API_BASE_URL
    case 'payments':
      return PAYMENT_API_BASE_URL
    case 'reclamations':
    case 'admin-reclamations':
      return RECLAMATION_API_BASE_URL
    default:
      return API_BASE_URL
  }
}

/**
 * Build full URL with base and version
 * For Gateway, path already includes /api/v1/..., so we don't add it again
 */
function buildUrl(path: string, service: 'auth' | 'users' | 'properties' | 'bookings' | 'payments' | 'reclamations' | 'admin-reclamations' = 'users'): string {
  const baseUrl = getServiceUrl(service)
  
  if (USE_GATEWAY) {
    // Gateway routes preserve the full path
    // Path should already include /api/v1/... or /api/... prefix
    // If path doesn't start with /api, add the appropriate prefix based on service
    if (path.startsWith('/api/')) {
      return `${baseUrl}${path}`
    }
    
    // Add appropriate prefix based on service
    if (service === 'auth' || service === 'users') {
      return `${baseUrl}/api/v1${path}`
    } else if (service === 'properties') {
      return `${baseUrl}/api/v1${path}`
    } else if (service === 'bookings') {
      return `${baseUrl}/api${path}`
    } else if (service === 'payments') {
      return `${baseUrl}/api${path}`
    } else if (service === 'reclamations' || service === 'admin-reclamations') {
      return `${baseUrl}/api${path}`
    }
    
    return `${baseUrl}${path}`
  }
  
  // For direct service calls, add version prefix
  const basePath = `/api/${API_VERSION}`
  return `${baseUrl}${basePath}${path}`
}

/**
 * Generic fetch wrapper with error handling
 */
async function request<T>(
  path: string, 
  options: RequestInit & { requiresAuth?: boolean; service?: 'auth' | 'users' | 'properties' | 'bookings' | 'payments' | 'reclamations' | 'admin-reclamations' } = {}
): Promise<T> {
  const { requiresAuth = true, service = 'users', ...fetchOptions } = options

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(requiresAuth && getAuthHeaders()),
    ...fetchOptions.headers,
  }

  const url = buildUrl(path, service)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      let errorData: any = {}
      let responseText = ""
      
      try {
        responseText = await response.text()
        if (responseText) {
          try {
            errorData = JSON.parse(responseText)
          } catch (parseError) {
            // If JSON parsing fails, use the raw text
            errorData = { message: responseText, raw: responseText }
          }
        }
      } catch (textError) {
        errorData = { message: `Failed to read response: ${textError}` }
      }
      
      // If errorData is still empty, create a default error
      if (Object.keys(errorData).length === 0) {
        errorData = { 
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText
        }
      }
      
      // Extract error message from ErrorResponse format (used by user-service)
      // ErrorResponse has: timestamp, status, error, message, path
      const errorMessage = 
        errorData.message ||           // ErrorResponse.message
        errorData.error ||             // ErrorResponse.error (error title)
        errorData.detail ||            // Standard Spring error format
        errorData.raw ||               // Raw response text if JSON parsing failed
        (Array.isArray(errorData.errors) ? errorData.errors.join(", ") : null) || // Validation errors array
        (typeof errorData === 'string' ? errorData : null) ||
        `API Error: ${response.status} ${response.statusText}`
      
      const apiError = new Error(errorMessage)
      ;(apiError as any).status = response.status
      ;(apiError as any).errorData = errorData
      ;(apiError as any).responseText = responseText
      throw apiError
    }

    // Check if response has content
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json()
      return data as T
    } else {
      // If no JSON content, return empty object for successful responses
      const text = await response.text()
      if (text) {
        // Try to parse as JSON, if fails return text as message
        try {
          return JSON.parse(text) as T
        } catch {
          return { message: text } as T
        }
      }
      return {} as T
    }
  } catch (error: any) {
    // Check if it's a connection error
    if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
      const connectionError = new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. Please make sure the backend is running.`
      )
      ;(connectionError as any).isConnectionError = true
      throw connectionError
    }
    
    throw error
  }
}

/**
 * Multipart form data request for file uploads
 */
async function requestFormData<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> & { requiresAuth?: boolean; service?: 'auth' | 'users' | 'properties' | 'bookings' | 'payments' | 'reclamations' | 'admin-reclamations' } = {},
): Promise<T> {
  const { requiresAuth = true, service = 'users', ...fetchOptions } = options

  const headers: HeadersInit = {
    ...(requiresAuth && getAuthHeaders()),
    ...fetchOptions.headers,
  }

  // Don't set Content-Type for FormData - browser will set it with boundary
  delete (headers as any)["Content-Type"]

  const url = buildUrl(path, service)

  try {
    const response = await fetch(url, {
      method: "POST",
      ...fetchOptions,
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API Error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

/**
 * API Client - Organized by resource
 */
export const apiClient = {
  // ==================== PROPERTIES ====================
  properties: {
    async getAll(): Promise<Property[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.getAll()
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties`
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(), // Include auth headers to check if user is ADMIN
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return response.json()
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
          const connectionError = new Error(
            `Cannot connect to property-service backend at ${PROPERTY_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    async getAllForAdmin(): Promise<Property[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.getAll()
      }
      // Use Gateway or property-service URL for admin endpoint
      const url = buildUrl("/properties/admin/all", 'properties')
      const authHeaders = getAuthHeaders()
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          // If it's an error object, throw it
          if (data.error || data.message) {
            throw new Error(data.error || data.message || "Invalid response format")
          }
          // Otherwise return empty array
          return []
        }
        
        return data
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
          const connectionError = new Error(
            `Cannot connect to property-service backend at ${PROPERTY_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    async getById(id: string): Promise<Property> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.getById(id)
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}`
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return response.json()
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED") || error?.message?.includes("CORS")) {
          const connectionError = new Error(
            `Cannot connect to property-service backend at ${PROPERTY_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    async getMyProperties(): Promise<Property[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.getAll()
      }

      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/my-properties`
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          // If it's an error object, throw it
          if (data.error || data.message) {
            throw new Error(data.error || data.message || "Invalid response format")
          }
          // Otherwise return empty array
          return []
        }
        
        return data
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED") || error?.message?.includes("CORS")) {
          const connectionError = new Error(
            `Cannot connect to property-service backend at ${PROPERTY_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    async create(data: CreatePropertyRequest, images: File[]): Promise<{ propertyId: string; id?: string }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        const result = await mock.properties.create(data, images)
        return { propertyId: result.id, id: result.id }
      }
      const formData = new FormData()
      // Create a Blob with JSON content type for the input part
      // Spring's @RequestPart expects Content-Type: application/json for JSON parts
      const inputBlob = new Blob([JSON.stringify(data)], { type: "application/json" })
      formData.append("input", inputBlob)

      images.forEach((file) => {
        formData.append("images", file)
      })

      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties`
      const headers: HeadersInit = {
        ...getAuthHeaders(),
      }
      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        const result = await response.json()
        return result
      } catch (error) {
        throw error
      }
    },

    async update(id: string, data: UpdatePropertyRequest): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.update(id, data)
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}`
      
      try {
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        // Backend returns "Property updated" as plain text, not JSON
        const responseText = await response.text()
        try {
          const parsed = JSON.parse(responseText)
          return parsed
        } catch {
          // If it's not JSON, return success object
          return { success: true }
        }
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED") || error?.message?.includes("CORS")) {
          const connectionError = new Error(
            `Cannot connect to property-service backend at ${PROPERTY_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    async delete(id: string): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.delete(id)
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}`
      
      try {
        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED") || error?.message?.includes("CORS")) {
          const connectionError = new Error(
            `Cannot connect to property-service backend at ${PROPERTY_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    async approve(id: string, isApproved: boolean): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.approve(id, isApproved)
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}/approve`
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ isApproved } as ApprovePropertyRequest),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        throw error
      }
    },

    /**
     * Hide property
     */
    async hide(id: string, isHidden: boolean): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return { success: true }
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}/hide`
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ isHidden }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        throw error
      }
    },

    async suspend(id: string, reason: string): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.suspend(id, reason)
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}/suspend`
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ reason }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        throw error
      }
    },

    async revokeSuspension(id: string): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.suspend(id, "") // Mock
      }
      // Use property-service URL for property endpoints
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}/revoke-suspension`
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        throw error
      }
    },

    async submitForApproval(id: string): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.properties.approve(id, true)
      }
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}/submit-for-approval`
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        throw error
      }
    },

    async cancelApprovalRequest(id: string): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return { success: true }
      }
      const url = `${PROPERTY_API_BASE_URL}/api/${API_VERSION}/properties/${id}/cancel-approval-request`
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return { success: true }
      } catch (error: any) {
        throw error
      }
    },

  },

  // ==================== VERIFICATION REQUESTS ====================
  verificationRequests: {
    async getAll(): Promise<VerificationRequest[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.verificationRequests.getAll()
      }
      return request("/verification-requests")
    },

    async getByStatus(status: string): Promise<VerificationRequest[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.verificationRequests.getByStatus(status)
      }
      return request(`/verification-requests/by-status/${status}`)
    },

    async create(propertyId: string, description: string): Promise<{ id: number }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.verificationRequests.create(propertyId, description)
      }
      return request("/verification-requests", {
        method: "POST",
        body: JSON.stringify({ propertyId, description }),
      })
    },

    async approve(id: number): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.verificationRequests.approve(id)
      }
      return request(`/verification-requests/${id}/approve`, {
        method: "PATCH",
      })
    },

    async reject(id: number, reason: string): Promise<{ success: boolean }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.verificationRequests.reject(id, reason)
      }
      return request(`/verification-requests/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      })
    },
  },

  // ==================== PROPERTY TYPES ====================
  propertyTypes: {
    async getAll(): Promise<PropertyType[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.propertyTypes.getAll()
      }
      return request("/property-types", { requiresAuth: false })
    },

    async getById(id: number): Promise<PropertyType> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.propertyTypes.getById(id)
      }
      return request(`/property-types/${id}`, { requiresAuth: false })
    },
  },

  // ==================== USERS ====================
  users: {
    async getMe(): Promise<{
      firstName: string
      lastName: string
      email: string
      profilePicture?: string
      birthday?: string
      phoneNumber?: number
      walletAddress?: string
      roles?: string[]
    }> {
      if (USE_MOCK_API) {
        // Mock user data for development
        return {
          firstName: "Mock",
          lastName: "User",
          email: "mock@example.com",
        }
      }
      return request("/users/me", {
        method: "GET",
        requiresAuth: true,
      })
    },

    /**
     * Get user information by ID (for getting phone number, etc.)
     */
    async getById(userId: string | number): Promise<{
      firstName: string
      lastName: string
      email: string
      profilePicture?: string
      birthday?: string
      phoneNumber?: number
      walletAddress?: string
      roles?: string[]
      score?: number
      rating?: number
      enabled?: boolean
    }> {
      if (USE_MOCK_API) {
        return {
          firstName: "Mock",
          lastName: "User",
          email: "mock@example.com",
          phoneNumber: 1234567890,
          score: 100,
        }
      }
      // Try to get from admin endpoint first (if user is admin) for more details
      try {
        const allUsers = await this.getAllForAdmin()
        const user = allUsers.find(u => String(u.id) === String(userId))
        if (user) {
          return {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profilePicture: user.profilePicture,
            birthday: user.birthday,
            phoneNumber: user.phoneNumber,
            walletAddress: user.walletAddress,
            roles: user.roles,
            score: user.score,
            enabled: user.enabled,
          }
        }
      } catch (err) {
        // If admin endpoint fails, fallback to regular endpoint
      }
      
      // Fallback to regular endpoint
      return request(`/users/${userId}`, {
        method: "GET",
        requiresAuth: true,
      })
    },

    async updateMe(data: {
      firstName?: string
      lastName?: string
      birthday?: string // YYYY-MM-DD format
      phoneNumber?: string // 10-15 digits
      walletAddress?: string // Ethereum address
    }): Promise<void> {
      if (USE_MOCK_API) {
        // Mock update
        return Promise.resolve()
      }
      return request("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
        requiresAuth: true,
      })
    },

    async updateProfilePicture(file: File): Promise<{ url: string }> {
      if (USE_MOCK_API) {
        return { url: "/placeholder-user.jpg" }
      }
      
      const formData = new FormData()
      formData.append("file", file)
      
      const headers = getAuthHeaders()
      // Remove Content-Type header to let browser set it with boundary for multipart/form-data
      delete headers["Content-Type"]
      
      const url = buildUrl("/users/me/profile-picture")
      
      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: formData,
      })

      if (!response.ok) {
        let errorData: any = {}
        let responseText = ""
        
        try {
          responseText = await response.text()
          if (responseText) {
            try {
              errorData = JSON.parse(responseText)
            } catch {
              errorData = { message: responseText, raw: responseText }
            }
          }
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        const errorMessage = 
          errorData.message ||
          errorData.error ||
          errorData.raw ||
          `API Error: ${response.status} ${response.statusText}`
        
        const apiError = new Error(errorMessage)
        ;(apiError as any).status = response.status
        ;(apiError as any).errorData = errorData
        throw apiError
      }

      const text = await response.text()
      return { url: text } // Backend returns URL as plain text
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
      if (USE_MOCK_API) {
        return { message: "Password changed successfully" }
      }
      return request("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
    },

    async deleteProfilePicture(): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request("/users/me/profile-picture", {
        method: "DELETE",
        requiresAuth: true,
      })
    },

    async becomeHost(): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request("/users/me/become-host", {
        method: "POST",
        requiresAuth: true,
      })
    },

    async getAllForAdmin(): Promise<Array<{
      id: number
      firstName: string
      lastName: string
      email: string
      profilePicture?: string
      birthday?: string
      phoneNumber?: number
      walletAddress?: string
      roles?: string[]
      enabled: boolean
      score: number
      rating?: number
    }>> {
      if (USE_MOCK_API) {
        return []
      }
      return request("/users/admin/all", {
        method: "GET",
        requiresAuth: true,
      })
    },

    async enableUser(userId: number): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request(`/users/admin/${userId}/enable`, {
        method: "POST",
        body: JSON.stringify({}),
        requiresAuth: true,
      })
    },

    async disableUser(userId: number): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request(`/users/admin/${userId}/disable`, {
        method: "POST",
        body: JSON.stringify({}),
        requiresAuth: true,
      })
    },

    async addAdminRole(userId: number): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request(`/users/admin/${userId}/add-admin-role`, {
        method: "POST",
        requiresAuth: true,
      })
    },

    async removeAdminRole(userId: number): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request(`/users/admin/${userId}/remove-admin-role`, {
        method: "POST",
        requiresAuth: true,
      })
    },

    async addHostRoleByAdmin(userId: number): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request(`/users/admin/${userId}/add-host-role`, {
        method: "POST",
        requiresAuth: true,
      })
    },

    async removeHostRole(userId: number): Promise<void> {
      if (USE_MOCK_API) {
        return Promise.resolve()
      }
      return request(`/users/admin/${userId}/remove-host-role`, {
        method: "POST",
        requiresAuth: true,
      })
    },
  },

  // ==================== AUTHENTICATION ====================
  auth: {
    async register(data: {
      firstName: string
      lastName: string
      email: string
      password: string
      birthday: string // YYYY-MM-DD format
      phoneNumber: string
      role?: string
    }): Promise<{ message: string }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        // Mock registration - simulate delay
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { message: "User registered successfully" }
      }
      
      try {
        const requestBody = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          birthday: data.birthday, // Should be YYYY-MM-DD format for LocalDate
          phoneNumber: data.phoneNumber, // Should be 10-15 digits only
          ...(data.role && { role: data.role }),
        }
        
        
        return await request("/auth/register", {
          method: "POST",
          body: JSON.stringify(requestBody),
          requiresAuth: false,
        })
      } catch (error: any) {
        // If connection fails, throw with helpful message
        if (error?.isConnectionError) {
          throw new Error(
            "Backend server is not available. Please make sure the user-service is running on port 8080."
          )
        }
        throw error
      }
    },

    async login(email: string, password: string): Promise<{ token: string; jwtExpiration: number }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        // Mock login - would use mock data
        throw new Error("Mock login not implemented - use useAuth hook")
      }
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      })
    },

    setAuth(token: string, user: User): void {
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
      }
    },

    getToken(): string | null {
      if (typeof window === "undefined") return null
      return localStorage.getItem(AUTH_TOKEN_KEY)
    },

    getUser(): User | null {
      if (typeof window === "undefined") return null
      const userData = localStorage.getItem(USER_DATA_KEY)
      return userData ? JSON.parse(userData) : null
    },

    clearAuth(): void {
      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(USER_DATA_KEY)
      }
    },

    hasRole(role: string): boolean {
      const user = this.getUser()
      return user?.roles.includes(role as any) ?? false
    },

    async verify(email: string, verificationCode: string): Promise<{ message: string }> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { message: "User verified successfully" }
      }
      return request("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email, verificationCode }),
        requiresAuth: false,
      })
    },

    async resendVerificationCode(email: string): Promise<{ message: string }> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { message: "Verification Code resent successfully" }
      }
      return request(`/auth/resend?email=${encodeURIComponent(email)}`, {
        method: "POST",
        requiresAuth: false,
      })
    },

    async forgotPassword(email: string): Promise<void> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return
      }
      return request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        requiresAuth: false,
      })
    },

    async verifyResetToken(token: string): Promise<{ valid: boolean }> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { valid: true }
      }
      return request("/auth/verify-reset-token", {
        method: "POST",
        body: JSON.stringify({ token }),
        requiresAuth: false,
      })
    },

    async resetPassword(token: string, password: string): Promise<void> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return
      }
      return request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        requiresAuth: false,
      })
    },

    async verifyResetCode(email: string, code: string): Promise<{ valid: boolean }> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { valid: true }
      }
      return request("/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email, code }),
        requiresAuth: false,
      })
    },

    async resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<{ message: string }> {
      if (USE_MOCK_API) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { message: "Password reset successfully" }
      }
      return request("/auth/reset-password-with-code", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
        requiresAuth: false,
      })
    },
  },

  bookings: {
    /**
     * Get all bookings for admin
     */
    async getAllForAdmin(): Promise<Array<{
      id: number
      userId: number
      propertyId: string
      propertyTitle: string
      propertyAddress: string
      ownerId: number | null
      tenantName: string
      tenantEmail: string
      hostName: string
      hostEmail: string
      checkInDate: string
      checkOutDate: string
      numberOfNights: number | null
      totalPrice: number | null
      longStayDiscountPercent: number | null
      requestedNegotiationPercent: number | null
      status: string
      onChainTxHash: string | null
      negotiationExpiresAt: string | null
      createdAt: string
      updatedAt: string | null
    }>> {
      if (USE_MOCK_API) {
        return []
      }
      const url = `${BOOKING_API_BASE_URL}/api/bookings/admin/all`
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to fetch bookings: ${response.status}`)
        }

        return response.json()
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
          const connectionError = new Error(
            `Cannot connect to booking-service backend at ${BOOKING_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    /**
     * Create a booking request
     * Sends booking data to booking-service via RabbitMQ
     */
    async create(data: {
      userId: string | number
      propertyId: string | number
      checkInDate: string
      checkOutDate: string
      numberOfGuests: number
      requestedPrice?: number
    }): Promise<{ status: string; message: string; error?: string }> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.bookings?.create?.(data) || { status: "accepted", message: "Booking request sent" }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/request`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: typeof data.userId === "string" ? parseInt(data.userId) : data.userId,
          propertyId: data.propertyId, // Keep as String (UUID from property-service)
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          numberOfGuests: data.numberOfGuests,
          requestedPrice: data.requestedPrice,
        }),
      })

      const responseData = await response.json()
      
      if (!response.ok) {
        // If status is "rejected", return the response data instead of throwing
        if (responseData.status === "rejected") {
          return responseData
        }
        throw new Error(responseData.message || `Failed to create booking: ${response.status}`)
      }

      return responseData
    },

    /**
     * Get booking by ID
     */
    async getById(id: string | number): Promise<any> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.bookings?.getById?.(id) || null
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${id}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch booking: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get bookings by tenant ID
     */
    async getByTenantId(tenantId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.bookings?.getByTenantId?.(tenantId) || []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings?tenantId=${tenantId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get current booking for a user
     */
    async getCurrentBooking(userId: string | number): Promise<any | null> {
      if (USE_MOCK_API) {
        // Mock: return null for now (no current booking)
        return null
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/current?userId=${userId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (response.status === 204 || response.status === 404) {
        return null
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch current booking: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get pending bookings (negotiations) for a user
     */
    async getPendingBookings(userId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        // Mock: return empty array
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/pending?userId=${userId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch pending bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get awaiting payment bookings for a user
     */
    async getAwaitingPaymentBookings(userId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        // Mock: return empty array
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/payment?userId=${userId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch awaiting payment bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get property info for booking (price, discount, negotiation)
     */
    async getPropertyInfo(propertyId: string): Promise<{
      id: string
      ownerId: number
      pricePerNight: number | string // Can be number or string (BigDecimal from backend)
      isNegotiable: boolean
      discountEnabled: boolean
      maxNegotiationPercent?: number
    }> {
      if (USE_MOCK_API) {
        // Mock property info
        return {
          id: propertyId,
          ownerId: 1,
          pricePerNight: 100,
          isNegotiable: false,
          discountEnabled: false,
        }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/property/${propertyId}`
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API Error: ${response.status}`)
        }

        return response.json()
      } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED") || error?.message?.includes("CORS")) {
          const connectionError = new Error(
            `Cannot connect to booking-service backend at ${BOOKING_API_BASE_URL}. Please make sure the backend is running.`
          )
          ;(connectionError as any).isConnectionError = true
          throw connectionError
        }
        throw error
      }
    },

    /**
     * Get last booking ID (for polling after creation)
     */
    async getLastBookingId(): Promise<{ bookingId: number } | null> {
      if (USE_MOCK_API) {
        return { bookingId: 1 }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/booking-id`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.status === 204 || response.status === 404) {
        return null
      }

      if (!response.ok) {
        return null
      }

      return response.json()
    },

    /**
     * Update a booking
     */
    async update(id: string | number, data: {
      checkInDate?: string
      checkOutDate?: string
      numberOfGuests?: number
      requestedPrice?: number
    }): Promise<any> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.bookings?.update?.(id, data) || null
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${id}`
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          numberOfGuests: data.numberOfGuests,
          requestedPrice: data.requestedPrice,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || `Failed to update booking: ${response.status}`
        const error = new Error(errorMessage)
        // Add status and error code for better error handling
        ;(error as any).status = response.status
        ;(error as any).errorCode = errorData.error
        throw error
      }

      const result = await response.json()
      return result
    },

    /**
     * Delete/Cancel a booking (by tenant)
     */
    async delete(id: string | number, userId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.bookings?.delete?.(id, userId)
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${id}?userId=${userId}`
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to cancel booking: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Tenant checkout (changes status to TENANT_CHECKED_OUT)
     */
    async tenantCheckout(id: string | number, tenantId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        return { message: "Tenant checked out successfully" }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${id}/checkout/tenant?userId=${tenantId}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to checkout: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Owner confirm checkout (changes status to COMPLETED)
     */
    async ownerConfirmCheckout(id: string | number, ownerId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        return { message: "Checkout confirmed successfully" }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${id}/checkout/owner?userId=${ownerId}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to confirm checkout: ${response.status}`)
      }

      return response.json()
    },

    /**
     * @deprecated Use tenantCheckout() or ownerConfirmCheckout() instead
     */
    async markAsCheckedOut(id: string | number, userId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        const mock = await getMockApi()
        return mock.bookings?.markAsCheckedOut?.(id, userId) || null
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${id}/checkout?userId=${userId}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to mark as checked out: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get current bookings by owner (host)
     */
    async getCurrentBookingsByOwner(ownerId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/current/owner?ownerId=${ownerId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch current bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get pending negotiations by owner (host)
     */
    async getPendingNegotiations(ownerId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/negotiations?ownerId=${ownerId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch pending negotiations: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Accept negotiation (host)
     */
    async acceptNegotiation(bookingId: string | number, ownerId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        return { message: "Negotiation accepted" }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${bookingId}/accept?ownerId=${ownerId}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to accept negotiation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Reject negotiation (host)
     */
    async rejectNegotiation(bookingId: string | number, ownerId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        return { message: "Negotiation rejected" }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${bookingId}/reject?ownerId=${ownerId}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to reject negotiation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get all bookings by owner (host)
     */
    async getByOwnerId(ownerId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings?ownerId=${ownerId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get confirmed bookings by owner (host)
     */
    async getConfirmedBookingsByOwner(ownerId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/confirmed/owner?ownerId=${ownerId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch confirmed bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get confirmed bookings by property ID
     */
    async getConfirmedBookingsByProperty(propertyId: string): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/confirmed/property/${propertyId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch confirmed bookings: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Report dispute (host or tenant)
     */
    async reportDispute(bookingId: string | number, userId: string | number): Promise<any> {
      if (USE_MOCK_API) {
        return { message: "Dispute reported" }
      }

      const url = `${BOOKING_API_BASE_URL}/api/bookings/${bookingId}/dispute?userId=${userId}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `Failed to report dispute: ${response.status}`)
      }

      return response.json()
    },
  },

  /**
   * Payment Service API
   */
  payments: {
    /**
     * Create payment intent
     */
    async createIntent(bookingId: number): Promise<any> {
      if (USE_MOCK_API) {
        return {
          referenceId: "mock-ref-id",
          to: "0x1234567890123456789012345678901234567890",
          value: "1000000000000000000",
          data: null,
          chainId: 31337,
          totalAmountWei: "1000000000000000000",
        }
      }

      const url = `${PAYMENT_API_BASE_URL}/api/payments/intent`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create payment intent: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get booking details for payment
     */
    async getBookingDetails(bookingId: number): Promise<any> {
      if (USE_MOCK_API) {
        return {
          bookingId,
          status: "PENDING_PAYMENT",
          totalPrice: 100.0,
          checkInDate: "2025-12-01",
          checkOutDate: "2025-12-05",
          propertyId: 1,
          propertyTitle: "Mock Property",
          propertyPrice: 20.0,
          ownerWalletAddress: "0x1234567890123456789012345678901234567890",
          userId: 1,
          currentUserId: 1,
          userFirstName: "John",
          userLastName: "Doe",
          userEmail: "john@example.com",
          userWalletAddress: null,
        }
      }

      const url = `${PAYMENT_API_BASE_URL}/api/payments/booking/${bookingId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        let errorMessage = `Failed to fetch booking details: ${response.status}`
        try {
          const errorData = await response.json()
          // Backend returns { code, message } format
          errorMessage = errorData.message || errorData.code || errorMessage
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      return response.json()
    },

    /**
     * Update wallet address
     */
    async updateWalletAddress(userId: number, walletAddress: string): Promise<void> {
      if (USE_MOCK_API) {
        return
      }

      const url = `${PAYMENT_API_BASE_URL}/api/payments/wallet-address`
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, walletAddress }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update wallet address: ${response.status}`)
      }
    },

    /**
     * Update transaction hash
     */
    async updateTransactionHash(bookingId: number, txHash: string): Promise<void> {
      if (USE_MOCK_API) {
        return
      }

      const url = `${PAYMENT_API_BASE_URL}/api/payments/booking/${bookingId}/tx-hash`
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update transaction hash: ${response.status}`)
      }
    },

    // Date modification removed - dates can only be changed from booking-service

    /**
     * Get transaction status
     */
    async getTransactionStatus(txHash: string): Promise<any> {
      if (USE_MOCK_API) {
        return {
          txHash,
          status: "PENDING",
          blockNumber: null,
          bookingId: null,
        }
      }

      const url = `${PAYMENT_API_BASE_URL}/api/payments/tx/${txHash}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch transaction status: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Complete booking on blockchain (called by host when confirming checkout)
     */
    async completeBooking(bookingId: number): Promise<any> {
      if (USE_MOCK_API) {
        return {
          status: "success",
          message: "Booking completed successfully on blockchain",
        }
      }

      const url = `${PAYMENT_API_BASE_URL}/api/payments/booking/${bookingId}/complete`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        let errorData: any = {}
        let errorText = ""
        try {
          errorText = await response.text()
          if (errorText) {
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { message: errorText }
            }
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorData = { message: response.statusText || `Server error: ${response.status}` }
        }
        
        const errorMessage = errorData.message || errorData.error || errorText || `Failed to complete booking: ${response.status}`
        
        
        throw new Error(errorMessage)
      }

      return response.json()
    },
  },

  // ==================== RECLAMATIONS ====================
  reclamations: {
    /**
     * Create a reclamation for a booking
     */
    async create(
      bookingId: string | number,
      userId: string | number,
      complainantRole: "GUEST" | "HOST",
      reclamationType: string,
      title?: string,
      description?: string,
      images?: File[]
    ): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success", message: "Reclamation created successfully" }
      }

      // Use reclamation-service directly to support images
      const formData = new FormData()
      formData.append("bookingId", String(bookingId))
      formData.append("userId", String(userId))
      formData.append("complainantRole", complainantRole)
      formData.append("reclamationType", reclamationType)
      if (title) formData.append("title", title)
      if (description) formData.append("description", description)
      if (images && images.length > 0) {
        images.forEach((image) => {
          formData.append("files", image)
        })
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/create`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get all reclamations by complainant ID (my complaints)
     */
    async getMyComplaints(userId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/my-complaints?userId=${userId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch complaints: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get all reclamations against a user (complaints against me)
     */
    async getComplaintsAgainstMe(userId: string | number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/against-me?userId=${userId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch complaints: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Upload attachments (images) for a reclamation
     */
    async uploadAttachments(reclamationId: number, files: File[]): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success" }
      }

      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/${reclamationId}/attachments`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to upload attachments: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get reclamation by booking ID and complainant ID
     */
    async getByBookingIdAndComplainant(
      bookingId: string | number,
      complainantId: string | number
    ): Promise<any | null> {
      if (USE_MOCK_API) {
        return null
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/booking/${bookingId}/complainant/${complainantId}`
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        })

        // 404 is expected when no reclamation exists - return null silently
        if (response.status === 404) {
          return null
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to fetch reclamation: ${response.status}`)
        }

        return response.json()
      } catch (error: any) {
        // Silently handle 404 errors (no reclamation exists - this is normal)
        if (error.message?.includes("404") || error.message?.includes("Not Found")) {
          return null
        }
        throw error
      }
    },

    /**
     * Get reclamation by ID
     */
    async getById(reclamationId: number): Promise<any | null> {
      if (USE_MOCK_API) {
        return null
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/${reclamationId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get reclamation attachments (images)
     */
    async getAttachments(reclamationId: number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/${reclamationId}/attachments`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch attachments: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Delete a reclamation
     */
    async delete(reclamationId: string | number, userId: string | number): Promise<void> {
      if (USE_MOCK_API) {
        return
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/${reclamationId}?userId=${userId}`
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to delete reclamation: ${response.status}`)
      }
    },

    /**
     * Update a reclamation (title, description, images)
     */
    async update(
      reclamationId: string | number,
      userId: string | number,
      title?: string,
      description?: string,
      images?: File[]
    ): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success", message: "Reclamation updated successfully" }
      }

      const formData = new FormData()
      formData.append("userId", String(userId))
      if (title) formData.append("title", title)
      if (description) formData.append("description", description)
      if (images && images.length > 0) {
        images.forEach((image) => {
          formData.append("files", image)
        })
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/${reclamationId}`
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get user phone number
     */
    async getUserPhoneNumber(userId: string | number): Promise<string | null> {
      if (USE_MOCK_API) {
        return null
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/user/${userId}/phone`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch phone number: ${response.status}`)
      }

      const data = await response.json()
      return data.phoneNumber || null
    },
  },

  // ==================== ADMIN RECLAMATIONS ====================
  adminReclamations: {
    /**
     * Get all reclamations (admin only)
     */
    async getAll(): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch reclamations: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get reclamations by status
     */
    async getByStatus(status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED"): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/status/${status}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch reclamations: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get reclamation by ID
     */
    async getById(reclamationId: number): Promise<any> {
      if (USE_MOCK_API) {
        return null
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/reclamations/${reclamationId}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Update reclamation severity
     */
    async updateSeverity(reclamationId: number, severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success" }
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/${reclamationId}/severity?severity=${severity}`
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update severity: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Review reclamation (move to IN_REVIEW)
     */
    async review(reclamationId: number): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success" }
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/${reclamationId}/review`
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to review reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Resolve reclamation with penalty
     */
    async resolve(reclamationId: number, resolutionNotes: string, approved: boolean): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success" }
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/${reclamationId}/resolve`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          resolutionNotes,
          approved,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to resolve reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Reject reclamation
     */
    async reject(reclamationId: number, rejectionNotes: string): Promise<any> {
      if (USE_MOCK_API) {
        return { status: "success" }
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/${reclamationId}/reject`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          rejectionNotes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to reject reclamation: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get reclamation attachments (images)
     */
    async getAttachments(reclamationId: number): Promise<any[]> {
      if (USE_MOCK_API) {
        return []
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/${reclamationId}/attachments`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch attachments: ${response.status}`)
      }

      return response.json()
    },

    /**
     * Get reclamation statistics
     */
    async getStatistics(): Promise<any> {
      if (USE_MOCK_API) {
        return {
          total: 0,
          open: 0,
          inReview: 0,
          resolved: 0,
          rejected: 0,
        }
      }

      const url = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/statistics`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch statistics: ${response.status}`)
      }

      return response.json()
    },
  },
}

export const apiBaseUrl = API_BASE_URL
export const apiVersion = API_VERSION
