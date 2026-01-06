import { request, requestFormData, AUTH_TOKEN_KEY, USER_DATA_KEY } from './core'
import { User } from '@/lib/types'

export const auth = {
    register: (data: any) => request<{ message: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        service: 'auth' as const,
        requiresAuth: false
    }),

    // Accept explicit credentials to avoid sending a raw string body
    login: (email: string, password: string) => request<{ token: string; jwtExpiration: number }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        service: 'auth' as const,
        requiresAuth: false
    }),

    verify: (email: string, verificationCode: string) => request<{ message: string }>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email, verificationCode }),
        service: 'auth' as const,
        requiresAuth: false
    }),

    resendVerificationCode: (email: string) => request<{ message: string }>(`/auth/resend?email=${encodeURIComponent(email)}`, {
        method: "POST",
        service: 'auth' as const,
        requiresAuth: false
    }),

    forgotPassword: (email: string) => request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        service: 'auth' as const,
        requiresAuth: false
    }),

    verifyResetToken: (token: string) => request<{ valid: boolean }>("/auth/verify-reset-token", {
        method: "POST",
        body: JSON.stringify({ token }),
        service: 'auth' as const,
        requiresAuth: false
    }),

    resetPassword: (token: string, password: string) => request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        service: 'auth' as const,
        requiresAuth: false
    }),

    // User management methods that were under 'apiClient' root in original file
    getMe: () => request<User>("/users/me", { service: 'users' as const }),

    updateMe: (data: any) => request<User>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
        service: 'users' as const
    }),

    uploadProfilePicture: (formData: FormData) => requestFormData<{ profilePicture: string }>("/users/me/profile-picture", formData, {
        method: "PUT",
        service: 'users' as const
    }),

    // Alias for compatibility with UI calls
    updateProfilePicture: (formData: FormData) => requestFormData<{ profilePicture: string }>("/users/me/profile-picture", formData, {
        method: "PUT",
        service: 'users' as const
    }),

    deleteProfilePicture: () => request<{ message?: string }>("/users/me/profile-picture", {
        method: "DELETE",
        service: 'users' as const
    }),

    deleteAccount: () => request<{ message?: string }>("/users/me", {
        method: "DELETE",
        service: 'users' as const
    }),

    // Let's redefine uploadProfilePicture to use requestFormData logic manually or import it

    changePassword: (currentPassword: string, newPassword: string) => request("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
        service: 'users' as const
    }),

    becomeHost: () => request("/users/me/become-host", {
        method: "POST",
        service: 'users' as const
    }),

    // Admin User Management
    getAllUsersEncoded: () => request<any[]>("/users/admin/all", { service: 'users' as const }),

    enableUser: (userId: number) => request(`/users/admin/${userId}/enable`, {
        method: "POST",
        service: 'users' as const
    }),

    disableUser: (userId: number) => request(`/users/admin/${userId}/disable`, {
        method: "POST",
        service: 'users' as const
    }),

    addAdminRole: (userId: number) => request(`/users/admin/${userId}/add-admin-role`, {
        method: "POST",
        service: 'users' as const
    }),

    removeAdminRole: (userId: number) => request(`/users/admin/${userId}/remove-admin-role`, {
        method: "POST",
        service: 'users' as const
    }),

    getById: (userId: number) => request<User>(`/users/${userId}`, {
        service: 'users' as const
    }),

    // Local Storage Helpers
    setAuth: (token: string, user: User) => {
        if (typeof window !== "undefined") {
            localStorage.setItem(AUTH_TOKEN_KEY, token)
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
        }
    },

    getToken: () => {
        if (typeof window === "undefined") return null
        return localStorage.getItem(AUTH_TOKEN_KEY)
    },

    getUser: (): User | null => {
        if (typeof window === "undefined") return null
        const userData = localStorage.getItem(USER_DATA_KEY)
        return userData ? JSON.parse(userData) : null
    },

    clearAuth: () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(AUTH_TOKEN_KEY)
            localStorage.removeItem(USER_DATA_KEY)
        }
    },

    hasRole: (role: string): boolean => {
        const userData = localStorage.getItem(USER_DATA_KEY)
        const user = userData ? JSON.parse(userData) : null
        return user?.roles.includes(role) ?? false
    }
}
