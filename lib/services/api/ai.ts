import { request } from './core'

export const marketTrends = {
    getAllCities: (periodMonths: number = 12) => request<any>(`/market-trends/all-cities?period_months=${periodMonths}`, {
        service: 'ai' as const
    }),

    getCityTrends: (city: string, periodMonths: number = 12) => request<any>(`/market-trends/city/${city}?period_months=${periodMonths}`, {
        service: 'ai' as const
    }),

    getInsights: (city: string) => request<any>(`/market-trends/insights/${city}`, {
        service: 'ai' as const
    })
}

export const recommendations = {
    getForTenant: (tenantId: number, maxResults: number = 5) => request<any>(`/recommendations/tenant/${tenantId}?max_results=${maxResults}`, {
        service: 'ai' as const
    }),

    getSimilarProperties: (propertyId: number, maxResults: number = 5) => request<any>(`/recommendations/similar/${propertyId}?max_results=${maxResults}`, {
        service: 'ai' as const
    })
}

export const tenantRisk = {
    assess: (tenantId: number) => request<any>(`/tenant-risk/${tenantId}`, {
        method: 'POST',
        service: 'ai' as const
    })
}
