import { request, requestFormData, getAuthHeaders, buildUrl } from './core'
import type { Property, PropertyRequest, CreatePropertyRequest, UpdatePropertyRequest } from '@/lib/types'

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
    if (Array.isArray(value)) return value
    if (value === null || value === undefined) return []
    return [value]
}

export const properties = {
    list: (params: Record<string, any> = {}) => {
        const query = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, String(value))
            }
        })
        const queryString = query.toString() ? `?${query.toString()}` : ''

        return request<Property[]>(`/properties${queryString}`, {
            method: "GET",
            service: 'properties' as const
        }).then(toArray)
    },

    getById: (id: string) => request<Property>(`/properties/${id}`, { service: 'properties' as const }),

    // Create property with multipart/form-data: JSON part + images
    create: async (data: CreatePropertyRequest, images: File[]): Promise<{ propertyId: string; id?: string }> => {
        const formData = new FormData()
        const inputBlob = new Blob([JSON.stringify(data)], { type: "application/json" })
        formData.append("input", inputBlob)
        images.forEach((file) => formData.append("images", file))

        return requestFormData<{ propertyId: string; id?: string }>("/properties", formData, {
            service: 'properties' as const,
            headers: getAuthHeaders(),
        })
    },

    // Update property with JSON payload
    update: async (id: string, data: UpdatePropertyRequest): Promise<{ success: boolean }> => {
        const url = buildUrl(`/properties/${id}`, 'properties')

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

        return { success: true }
    },

    delete: (id: string) => request(`/properties/${id}`, {
        method: "DELETE",
        service: 'properties' as const
    }),

    uploadImages: (id: string, formData: FormData) => requestFormData<string[]>(`/properties/${id}/images`, formData, {
        service: 'properties' as const
    }),

    deleteImage: (id: string, imageUrl: string) => request(`/properties/${id}/images?url=${encodeURIComponent(imageUrl)}`, {
        method: "DELETE",
        service: 'properties' as const
    }),

    // Likes/Favorites
    toggleLike: (id: string, userId: number) => request(`/properties/${id}/like?userId=${userId}`, {
        method: "POST",
        service: 'properties' as const
    }),

    // Admin / Moderation
    approve: (id: string, isApproved: boolean) => request<{ success: boolean }>(`/properties/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ isApproved }),
        service: 'properties' as const
    }),

    hide: (id: string, isHidden: boolean) => request<{ success: boolean }>(`/properties/${id}/hide`, {
        method: "PATCH",
        body: JSON.stringify({ isHidden }),
        service: 'properties' as const
    }),

    suspend: (id: string, reason: string) => request<{ success: boolean }>(`/properties/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
        service: 'properties' as const
    }),

    revokeSuspension: (id: string) => request<{ success: boolean }>(`/properties/${id}/revoke-suspension`, {
        method: "PATCH",
        service: 'properties' as const
    }),

    submitForApproval: (id: string) => request<{ success: boolean }>(`/properties/${id}/submit-for-approval`, {
        method: "PATCH",
        service: 'properties' as const
    }),

    cancelApprovalRequest: (id: string) => request<{ success: boolean }>(`/properties/${id}/cancel-approval-request`, {
        method: "PATCH",
        service: 'properties' as const
    }),

    // Owner-scoped listing used in dashboards - calls dedicated my-properties endpoint
    getMyProperties: () => {
        return request<Property[]>(`/properties/my-properties`, {
            method: "GET",
            service: 'properties' as const
        }).then(toArray)
    },

    // Alias for backwards compatibility
    getAll: (params: Record<string, any> = {}) => {
        const query = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, String(value))
            }
        })
        const queryString = query.toString() ? `?${query.toString()}` : ''
        return request<Property[]>(`/properties${queryString}`, {
            method: "GET",
            service: 'properties' as const
        }).then(toArray)
    },

    // Admin endpoint to get all properties regardless of status
    getAllForAdmin: () => request<Property[]>(`/properties/admin/all`, {
        method: "GET",
        service: 'properties' as const
    }).then(toArray),

    // AI Pricing
    predictPrice: (
        propertyId: string,
        checkInDate: string,
        checkOutDate: string,
    ) => request<{
        predictedPriceMad?: number
        predictedPriceUsd?: number
        confidenceIntervalLower?: number
        confidenceIntervalUpper?: number
        currentPriceMad?: number
        priceDifferencePercent?: number
        recommendation?: string
        // Backward compatibility with older field naming
        predicted_price?: number
        currency?: string
    }>(`/properties/${propertyId}/predict-price`, {
        method: "POST",
        body: JSON.stringify({ checkInDate, checkOutDate }),
        service: 'properties' as const
    }),
}

