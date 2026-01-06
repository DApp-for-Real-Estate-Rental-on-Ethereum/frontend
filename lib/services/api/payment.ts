import { request } from './core'

export const payments = {
    // Backend expects /api/payments/intent with bookingId in body
    createIntent: (bookingId: number) => request<any>("/payments/intent", {
        method: "POST",
        body: JSON.stringify({ bookingId }),
        service: 'payments' as const
    }),

    // Note: Confirm payment is usually handled by Stripe client-side, but if backend has endpoint:
    confirmPayment: (paymentIntentId: string) => request<{ status: string }>("/payments/confirm", {
        method: "POST",
        body: JSON.stringify({ paymentIntentId }),
        service: 'payments' as const
    }),

    processCryptoPayment: (data: { bookingId: number; txHash: string; walletAddress: string; amount: string; currency: string }) =>
        request("/payments/crypto/process", {
            method: "POST",
            body: JSON.stringify(data),
            service: 'payments' as const
        }),

    getHistory: (userId: number) => request<any[]>(`/payments/history?userId=${userId}`, {
        service: 'payments' as const
    }),

    getByBooking: (bookingId: number) => request<any>(`/payments/booking/${bookingId}`, {
        service: 'payments' as const
    }),

    // Alias used by some pages to retrieve booking payment details
    getBookingDetails: (bookingId: number) => request<any>(`/payments/booking/${bookingId}`, {
        service: 'payments' as const
    }),

    updateWalletAddress: (userId: number, walletAddress: string) => request(`/payments/wallet-address`, {
        method: "PUT",
        body: JSON.stringify({ userId, walletAddress }),
        service: 'payments' as const
    }),

    updateTransactionHash: (bookingId: number, txHash: string) => request(`/payments/booking/${bookingId}/tx-hash`, {
        method: "PUT",
        body: JSON.stringify({ txHash }),
        service: 'payments' as const
    }),

    getTransactionStatus: (txHash: string) => request<any>(`/payments/tx/${txHash}`, {
        service: 'payments' as const
    }),

    completeBooking: (bookingId: number) => request(`/payments/booking/${bookingId}/complete`, {
        method: "POST",
        service: 'payments' as const
    })
}
