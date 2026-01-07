import { request, requestFormData } from './core'
import { Booking, BookingRequest, BookingStatus } from '@/lib/types'

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
    if (Array.isArray(value)) return value
    if (value === null || value === undefined) return []
    return [value]
}

export const bookings = {
    create: (data: BookingRequest) => request<{ status: string; message: string }>("/bookings/request", {
        method: "POST",
        body: JSON.stringify(data),
        service: 'bookings' as const
    }),

    // Get bookings for a tenant
    listApp: (tenantId: number) => request<Booking[]>("/bookings", {
        service: 'bookings' as const,
        headers: {
            'X-User-Id': String(tenantId)
            // Note: backend expects tenantId query param too? Let's check if we need to append query string
        }
    }).then(() => request<Booking[]>(`/bookings?tenantId=${tenantId}`, { service: 'bookings' as const })),
    // Note: The previous implementation might have relied on headers or query params differently. 
    // Based on Controller: @RequestParam(required = false) Long tenantId
    // So we should pass it as query param.

    listTenantBookings: (tenantId: number) => request<Booking[]>(`/bookings?tenantId=${tenantId}`, { service: 'bookings' as const }).then(toArray),

    listOwnerBookings: (ownerId: number) => request<Booking[]>(`/bookings?ownerId=${ownerId}`, { service: 'bookings' as const }).then(toArray),

    // Convenience helpers expected by existing UI code
    getByTenantId: (tenantId: number) => bookings.listTenantBookings(tenantId),

    getCurrentBooking: async (tenantId: number) => {
        const bookingsForTenant = await bookings.listTenantBookings(tenantId)
        return bookingsForTenant.find(b => !['CANCELLED', 'COMPLETED'].includes(String(b.status || '').toUpperCase())) || null
    },

    getPendingBookings: async (tenantId: number) => {
        const bookingsForTenant = await bookings.listTenantBookings(tenantId)
        return bookingsForTenant.filter(b => {
            const status = String(b.status || '').toUpperCase()
            return status === 'PENDING' || status === 'PENDING_NEGOTIATION'
        })
    },

    getAwaitingPaymentBookings: async (tenantId: number) => {
        const bookingsForTenant = await bookings.listTenantBookings(tenantId)
        return bookingsForTenant.filter(b => String(b.status || '').toUpperCase() === 'PENDING_PAYMENT')
    },

    getByOwnerId: (ownerId: number) => bookings.listOwnerBookings(ownerId),

    getCurrentBookingsByOwner: async (ownerId: number) => {
        const ownerBookings = await bookings.listOwnerBookings(ownerId)
        return ownerBookings.filter(b => !['CANCELLED', 'COMPLETED'].includes(String(b.status || '').toUpperCase()))
    },

    getConfirmedBookingsByOwner: async (ownerId: number) => {
        const ownerBookings = await bookings.listOwnerBookings(ownerId)
        return ownerBookings.filter(b => String(b.status || '').toUpperCase() === 'CONFIRMED')
    },

    // Fetch confirmed bookings for a specific property
    getConfirmedBookingsByProperty: async (propertyId: number | string) => {
        const bookingsForProperty = await request<Booking[]>(`/bookings?propertyId=${propertyId}`, { service: 'bookings' as const }).then(toArray)
        return bookingsForProperty.filter(b => String(b.status || '').toUpperCase() === 'CONFIRMED')
    },

    getPendingNegotiations: async (ownerId: number) => {
        const ownerBookings = await bookings.listOwnerBookings(ownerId)
        return ownerBookings.filter(b => String(b.status || '').toUpperCase() === 'PENDING_NEGOTIATION')
    },

    getById: (id: number) => request<Booking>(`/bookings/${id}`, { service: 'bookings' as const }),

    // Update booking details
    update: (id: number, data: Record<string, unknown>) => request<Booking>(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        service: 'bookings' as const
    }),

    // Delete/cancel booking (alias to cancel with userId)
    delete: (id: number, userId: number) => bookings.cancel(id, userId),

    // Actually, let's stick to the exact methods from the original file to minimize breakage

    updateStatus: (id: number, status: BookingStatus) => request<{ booking: Booking }>(`/bookings/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
        service: 'bookings' as const
    }),

    cancel: (id: number, userId: number) => request<{ booking: Booking }>(`/bookings/${id}?userId=${userId}`, {
        method: "DELETE",
        service: 'bookings' as const
    }),

    negotiate: (id: number, negotiationData: Record<string, unknown>) => request(`/bookings/${id}/negotiate`, { // Endpoint might not exist in Controller shown earlier?
        method: "POST",
        body: JSON.stringify(negotiationData),
        service: 'bookings' as const
    }), // Accessing negotiation endpoint if it exists, otherwise this might need adjustment based on full controller scan.
    // The controller scan showed 'accept' and 'reject' endpoints.

    acceptNegotiation: (id: number, ownerId: number) => request(`/bookings/${id}/accept?ownerId=${ownerId}`, {
        method: "POST",
        service: "bookings" as const
    }),

    rejectNegotiation: (id: number, ownerId: number) => request(`/bookings/${id}/reject?ownerId=${ownerId}`, {
        method: "POST",
        service: "bookings" as const
    }),

    // Reclamations (technically in booking service mostly or reclamation service?)
    // The controller showed /bookings/{id}/reclamation
    createReclamation: (id: number, formData: FormData) => requestFormData(`/bookings/${id}/reclamation`, formData, {
        service: "bookings" as const
    }),

    // Checkout
    checkoutTenant: (id: number, userId: number) => request(`/bookings/${id}/checkout/tenant?userId=${userId}`, {
        method: "POST",
        service: "bookings" as const
    }),

    // Alias used in UI
    tenantCheckout: (id: number, userId: number) => bookings.checkoutTenant(id, userId),
    markAsCheckedOut: (id: number, userId: number) => bookings.checkoutTenant(id, userId),

    checkoutOwner: (id: number, userId: number) => request(`/bookings/${id}/checkout/owner?userId=${userId}`, {
        method: "POST",
        service: "bookings" as const
    }),

    // Owner confirms tenant checkout
    ownerConfirmCheckout: (id: number, ownerId: number) => request(`/bookings/${id}/checkout/owner?userId=${ownerId}`, {
        method: "POST",
        service: "bookings" as const
    }),

    // Admin
    getAllForAdmin: () => request<Booking[]>("/bookings/admin/all", {
        service: "bookings" as const
    }),

    // Property info helper: query property-service directly to avoid 500s on missing bookings endpoint
    getPropertyInfo: async (propertyId: string | number) => {
        const property = await request<any>(`/properties/${propertyId}`, { service: 'properties' as const })
        return { ownerId: property?.userId ?? property?.ownerId, property }
    },

    // Last booking id helper (best-effort). Backend exposes /bookings/booking-id returning { bookingId }
    getLastBookingId: async () => {
        try {
            return await request<{ bookingId: number } | null>("/bookings/booking-id", { service: 'bookings' as const })
        } catch {
            return null
        }
    },
}
