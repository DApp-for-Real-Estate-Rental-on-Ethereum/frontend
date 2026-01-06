import { request, requestFormData } from './core'

export const reclamations = {
    create: (
        bookingId: string | number,
        userId: string | number,
        complainantRole: "GUEST" | "HOST",
        reclamationType: string,
        title?: string,
        description?: string,
        images?: File[]
    ) => {
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
        return requestFormData<{ reclamationId: string | number }>("/reclamations/create", formData, {
            service: 'reclamations' as const
        })
    },

    getMyComplaints: (userId: number) => request<any[]>(`/reclamations/my-complaints?userId=${userId}`, {
        service: 'reclamations' as const
    }),

    getComplaintsAgainstMe: (userId: number) => request<any[]>(`/reclamations/against-me?userId=${userId}`, {
        service: 'reclamations' as const
    }),

    getById: (id: number) => request<any>(`/reclamations/${id}`, {
        service: 'reclamations' as const
    }),

    getByBookingIdAndComplainant: (bookingId: number, complainantId: number) => request<any>(`/reclamations/booking/${bookingId}/complainant/${complainantId}`, {
        service: 'reclamations' as const
    }),

    addMessage: (id: number, message: string, userId: number) => request(`/reclamations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ message, userId }),
        service: 'reclamations' as const
    }),

    resolve: (id: number, resolution: string) => request(`/reclamations/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution }),
        service: 'reclamations' as const
    }),

    uploadAttachments: (id: number, files: File[]) => {
        const formData = new FormData()
        files.forEach(f => formData.append("files", f))
        return requestFormData(`/reclamations/${id}/attachments`, formData, { service: 'reclamations' as const })
    },

    delete: (id: number, userId: number) => request(`/reclamations/${id}?userId=${userId}`, {
        method: "DELETE",
        service: 'reclamations' as const
    }),

    update: (id: number, userId: number, title?: string, description?: string, images?: File[]) => {
        const formData = new FormData()
        formData.append("userId", String(userId))
        if (title) formData.append("title", title)
        if (description) formData.append("description", description)
        if (images) images.forEach(f => formData.append("files", f))

        return requestFormData(`/reclamations/${id}`, formData, {
            method: "PUT",
            service: 'reclamations' as const
        })
    },

    getUserPhoneNumber: (userId: number) => request<{ phoneNumber: string }>(`/reclamations/user/${userId}/phone`, {
        service: 'reclamations' as const
    }).then(res => res?.phoneNumber || null),

    // Admin sub-namespace
    admin: {
        getAll: () => request<any[]>("/admin/reclamations", { service: 'admin-reclamations' as const }),

        updateStatus: (id: number, status: string) => request(`/admin/reclamations/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
            service: 'admin-reclamations' as const
        }),

        getStatistics: () => request<any>("/admin/reclamations/statistics", { service: 'admin-reclamations' as const }),

        getAttachments: (id: number) => request<any[]>(`/admin/reclamations/${id}/attachments`, { service: 'admin-reclamations' as const })
    }
}
