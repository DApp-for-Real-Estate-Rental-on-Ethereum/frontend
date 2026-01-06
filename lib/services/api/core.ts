/**
 * API Core Service
 * Handles configuration, authentication headers, and base request logic.
 */

// Configuration from environment variables
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || ""
const USE_GATEWAY = process.env.NEXT_PUBLIC_USE_GATEWAY !== "false" // Default to true

// Fallback URLs for individual services
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
export const PROPERTY_API_BASE_URL = process.env.NEXT_PUBLIC_PROPERTY_API_BASE_URL || "http://localhost:8081"
export const BOOKING_API_BASE_URL = USE_GATEWAY
    ? GATEWAY_URL
    : (process.env.NEXT_PUBLIC_BOOKING_API_BASE_URL || "http://localhost:8083")
export const PAYMENT_API_BASE_URL = USE_GATEWAY
    ? GATEWAY_URL
    : (process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL || "http://localhost:8085")
export const RECLAMATION_API_BASE_URL = USE_GATEWAY
    ? GATEWAY_URL
    : (process.env.NEXT_PUBLIC_RECLAMATION_API_BASE_URL || "http://localhost:8091")

export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1"
export const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || "derent5_auth_token"
export const USER_DATA_KEY = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data"
export const USE_MOCK_API = false

/**
 * Decode JWT token to extract userId from subject
 */
function decodeJWT(token: string): { userId?: string; roles?: string[] } | null {
    try {
        const parts = token.split(".")
        if (parts.length !== 3) return null
        const payload = parts[1]
        const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
        return {
            userId: decoded.sub || decoded.subject,
            roles: decoded.roles || [],
        }
    } catch (error) {
        return null
    }
}

/**
 * Get authentication headers from localStorage
 */
export function getAuthHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {}

    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return {}

    const decoded = decodeJWT(token)
    let userId = decoded?.userId
    let roles: string[] = decoded?.roles || []

    const userData = localStorage.getItem(USER_DATA_KEY)
    if (userData) {
        try {
            const user = JSON.parse(userData)
            userId = userId || user.id || ""
            roles = roles.length > 0 ? roles : (user.roles || [])
        } catch (error) {
            // Failed to parse user data
        }
    }

    const userIdString = userId ? String(userId) : ""

    return {
        "X-User-Id": userIdString,
        "X-User-Roles": roles.join(","),
        ...(token && { Authorization: `Bearer ${token}` }),

    }
}

export type ServiceType = 'auth' | 'users' | 'properties' | 'bookings' | 'payments' | 'reclamations' | 'admin-reclamations' | 'ai'

/**
 * Helper function to get the correct base URL for a service
 */
export function getServiceUrl(service: ServiceType): string {
    if (USE_GATEWAY) return GATEWAY_URL

    switch (service) {
        case 'auth':
        case 'users': return API_BASE_URL
        case 'properties': return PROPERTY_API_BASE_URL
        case 'bookings': return BOOKING_API_BASE_URL
        case 'payments': return PAYMENT_API_BASE_URL
        case 'reclamations':
        case 'admin-reclamations': return RECLAMATION_API_BASE_URL
        case 'ai': return GATEWAY_URL
        default: return API_BASE_URL
    }
}

/**
 * Build full URL with base and version
 */
export function buildUrl(path: string, service: ServiceType = 'users'): string {
    const baseUrl = getServiceUrl(service)

    if (USE_GATEWAY) {
        if (path.startsWith('/api/')) return `${baseUrl}${path}`

        // AI service uses /api without version prefix
        if (service === 'ai') {
            return `${baseUrl}/api${path}`
        }

        if (service === 'auth' || service === 'users' || service === 'properties') {
            return `${baseUrl}/api/v1${path}`
        } else {
            return `${baseUrl}/api${path}`
        }
    }

    const basePath = `/api/${API_VERSION}`
    return `${baseUrl}${basePath}${path}`
}

/**
 * Generic fetch wrapper with error handling
 */
export async function request<T>(
    path: string,
    options: RequestInit & { requiresAuth?: boolean; service?: ServiceType } = {}
): Promise<T> {
    const { requiresAuth = true, service = 'users', ...fetchOptions } = options

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(requiresAuth && getAuthHeaders()),
        ...fetchOptions.headers,
    }

    const url = buildUrl(path, service)

    try {
        const response = await fetch(url, { ...fetchOptions, headers })

        if (!response.ok) {
            let errorData: any = {}
            const responseText = await response.text().catch(() => "")

            try {
                errorData = JSON.parse(responseText)
            } catch {
                errorData = { message: responseText, raw: responseText }
            }

            const errorMessage = errorData.message || errorData.error || errorData.detail || `API Error: ${response.status}`
            throw new Error(errorMessage)
        }

        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
            return await response.json() as T
        } else {
            const text = await response.text()
            try {
                return JSON.parse(text) as T
            } catch {
                return { message: text } as any
            }
        }
    } catch (error: any) {
        if (error?.message?.includes("Failed to fetch") || error?.message?.includes("ERR_CONNECTION_REFUSED")) {
            throw new Error(`Cannot connect to backend server.`)
        }
        throw error
    }
}

/**
 * Multipart form data request for file uploads
 */
export async function requestFormData<T>(
    path: string,
    formData: FormData,
    options: Omit<RequestInit, "body" | "method"> & { requiresAuth?: boolean; service?: ServiceType; method?: "POST" | "PUT" | "PATCH" } = {},
): Promise<T> {
    const { requiresAuth = true, service = 'users', method = "POST", ...fetchOptions } = options

    const headers: HeadersInit = {
        ...(requiresAuth && getAuthHeaders()),
        ...fetchOptions.headers,
    }

    // Browser sets Content-Type boundary automatically
    const url = buildUrl(path, service)

    const response = await fetch(url, {
        method,
        ...fetchOptions,
        headers,
        body: formData,
    })

    if (!response.ok) {
        const responseText = await response.text().catch(() => "")
        let errorData: any = {}

        try {
            errorData = JSON.parse(responseText)
        } catch {
            errorData = { message: responseText, raw: responseText }
        }

        const errorMessage = errorData.message || errorData.error || errorData.detail || `API Error: ${response.status}`
        throw new Error(errorMessage)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
        return await response.json() as T
    }

    const text = await response.text()
    try {
        return JSON.parse(text) as T
    } catch {
        return { message: text } as any
    }
}
