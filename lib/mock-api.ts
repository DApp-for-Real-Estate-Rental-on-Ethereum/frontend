// Mock API implementation for development/testing
// Provides identical interface to real API but uses local mock data

import type {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyType,
  VerificationRequest,
} from "@/lib/types"
import {
  mockProperties,
  mockPropertyTypes,
  mockVerificationRequests,
  mockAmenities,
  simulateNetworkDelay,
} from "./mock-data"

// In-memory storage for mutations during session
const propertiesStore = JSON.parse(JSON.stringify(mockProperties))
const verificationRequestsStore = JSON.parse(JSON.stringify(mockVerificationRequests))

export const mockApi = {
  getProperties: async (): Promise<Property[]> => {
    await simulateNetworkDelay()
    return propertiesStore
  },

  getVerificationRequests: async (): Promise<VerificationRequest[]> => {
    await simulateNetworkDelay()
    return verificationRequestsStore
  },

  approveVerification: async (id: number): Promise<{ success: boolean }> => {
    await simulateNetworkDelay()
    const vr = verificationRequestsStore.find((v: VerificationRequest) => v.id === id)
    if (!vr) throw new Error(`Verification request ${id} not found`)
    vr.status = "APPROVED"
    return { success: true }
  },

  rejectVerification: async (id: number): Promise<{ success: boolean }> => {
    await simulateNetworkDelay()
    const vr = verificationRequestsStore.find((v: VerificationRequest) => v.id === id)
    if (!vr) throw new Error(`Verification request ${id} not found`)
    vr.status = "REJECTED"
    return { success: true }
  },

  properties: {
    async getAll(): Promise<Property[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getAll properties")
      return propertiesStore
    },

    async getById(id: string): Promise<Property> {
      await simulateNetworkDelay()
      const property = propertiesStore.find((p: Property) => p.id === id)
      if (!property) throw new Error(`Property ${id} not found`)
      console.log("[v0] Mock API: getById property", id)
      return property
    },

    async create(data: CreatePropertyRequest, images: File[]): Promise<{ id: string }> {
      await simulateNetworkDelay(500)
      const newId = `prop-${Date.now()}`
      const newProperty: Property = {
        id: newId,
        userId: "user-123",
        title: data.title,
        description: data.description,
        price: data.price,
        capacity: data.capacity,
        numberOfBedrooms: data.numberOfBedrooms,
        numberOfBathrooms: data.numberOfBathrooms,
        numberOfBeds: data.numberOfBeds,
        type: mockPropertyTypes.find((t) => t.id === data.typeId),
        status: "PENDING_APPROVAL",
        address: data.address,
        propertyImages: images.map((_, i) => ({
          id: i,
          url: `https://via.placeholder.com/800x600?text=Image+${i + 1}`,
          cover: i === 0,
        })),
        amenities: data.amenities || [],
      } as Property

      propertiesStore.push(newProperty)
      console.log("[v0] Mock API: created property", newId)
      return { id: newId }
    },

    async update(id: string, data: UpdatePropertyRequest): Promise<{ success: boolean }> {
      await simulateNetworkDelay()
      const property = propertiesStore.find((p: Property) => p.id === id)
      if (!property) throw new Error(`Property ${id} not found`)

      Object.assign(property, data)
      console.log("[v0] Mock API: updated property", id)
      return { success: true }
    },

    async delete(id: string): Promise<{ success: boolean }> {
      await simulateNetworkDelay()
      const index = propertiesStore.findIndex((p: Property) => p.id === id)
      if (index === -1) throw new Error(`Property ${id} not found`)

      propertiesStore.splice(index, 1)
      console.log("[v0] Mock API: deleted property", id)
      return { success: true }
    },

    async approve(id: string, isApproved: boolean): Promise<{ success: boolean }> {
      await simulateNetworkDelay()
      const property = propertiesStore.find((p: Property) => p.id === id)
      if (!property) throw new Error(`Property ${id} not found`)

      property.status = isApproved ? "APPROVED" : "DISAPPROVED"
      console.log("[v0] Mock API: approved/disapproved property", id, isApproved)
      return { success: true }
    },

    async suspend(id: string, reason: string): Promise<{ success: boolean }> {
      await simulateNetworkDelay()
      const property = propertiesStore.find((p: Property) => p.id === id)
      if (!property) throw new Error(`Property ${id} not found`)

      property.status = "SUSPENDED"
      console.log("[v0] Mock API: suspended property", id, reason)
      return { success: true }
    },
  },

  verificationRequests: {
    async getAll(): Promise<VerificationRequest[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getAll verification requests")
      return verificationRequestsStore
    },

    async getByStatus(status: string): Promise<VerificationRequest[]> {
      await simulateNetworkDelay()
      const filtered = verificationRequestsStore.filter((vr: VerificationRequest) => vr.status === status)
      console.log("[v0] Mock API: getByStatus verification requests", status)
      return filtered
    },

    async create(propertyId: string, description: string): Promise<{ id: number }> {
      await simulateNetworkDelay()
      const newId = verificationRequestsStore.length + 1
      verificationRequestsStore.push({
        id: newId,
        status: "PENDING",
        description,
        createdAt: new Date().toISOString(),
      })
      console.log("[v0] Mock API: created verification request", newId)
      return { id: newId }
    },

    async approve(id: number): Promise<{ success: boolean }> {
      await simulateNetworkDelay()
      const vr = verificationRequestsStore.find((v: VerificationRequest) => v.id === id)
      if (!vr) throw new Error(`Verification request ${id} not found`)

      vr.status = "APPROVED"
      console.log("[v0] Mock API: approved verification request", id)
      return { success: true }
    },

    async reject(id: number, reason: string): Promise<{ success: boolean }> {
      await simulateNetworkDelay()
      const vr = verificationRequestsStore.find((v: VerificationRequest) => v.id === id)
      if (!vr) throw new Error(`Verification request ${id} not found`)

      vr.status = "REJECTED"
      vr.response = reason
      console.log("[v0] Mock API: rejected verification request", id, reason)
      return { success: true }
    },
  },

  propertyTypes: {
    async getAll(): Promise<PropertyType[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getAll property types")
      return mockPropertyTypes
    },

    async getById(id: number): Promise<PropertyType> {
      await simulateNetworkDelay()
      const type = mockPropertyTypes.find((t) => t.id === id)
      if (!type) throw new Error(`Property type ${id} not found`)
      console.log("[v0] Mock API: getById property type", id)
      return type
    },
  },

  amenities: {
    async getAll() {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getAll amenities")
      return mockAmenities
    },
  },

  bookings: {
    async create(data: {
      userId: string | number
      propertyId: string | number
      checkInDate: string
      checkOutDate: string
      numberOfGuests: number
      requestedPrice?: number
    }): Promise<{ status: string; message: string }> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: create booking", data)
      return { status: "accepted", message: "Booking request sent" }
    },

    async update(id: string | number, data: any): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: update booking", id, data)
      return {
        id: typeof id === "string" ? parseInt(id) : id,
        ...data,
      }
    },

    async delete(id: string | number, userId: string | number): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: delete booking", id, userId)
      return { message: "Booking cancelled" }
    },

    async markAsCheckedOut(id: string | number, userId: string | number): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: markAsCheckedOut booking", id, userId)
      return {
        id: typeof id === "string" ? parseInt(id) : id,
        userId: typeof userId === "string" ? parseInt(userId) : userId,
        status: "TENANT_CHECKED_OUT",
      }
    },

    async getById(id: string | number): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getById booking", id)
      return {
        id: typeof id === "string" ? parseInt(id) : id,
        userId: 1,
        propertyId: 1,
        checkInDate: "2025-12-01",
        checkOutDate: "2025-12-05",
        totalPrice: 1000.0,
        status: "PENDING",
      }
    },

    async getByTenantId(tenantId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getByTenantId bookings", tenantId)
      return []
    },

    async getLastBookingId(): Promise<{ bookingId: number } | null> {
      await simulateNetworkDelay()
      return { bookingId: 1 }
    },

    async getCurrentBooking(userId: string | number): Promise<any | null> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getCurrentBooking", userId)
      return null
    },

    async getPendingBookings(userId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getPendingBookings", userId)
      return []
    },

    async getAwaitingPaymentBookings(userId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getAwaitingPaymentBookings", userId)
      return []
    },

    async getPendingNegotiations(ownerId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getPendingNegotiations", ownerId)
      return []
    },

    async acceptNegotiation(bookingId: string | number, ownerId: string | number): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: acceptNegotiation", bookingId, ownerId)
      return { message: "Negotiation accepted" }
    },

    async rejectNegotiation(bookingId: string | number, ownerId: string | number): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: rejectNegotiation", bookingId, ownerId)
      return { message: "Negotiation rejected" }
    },

    async getByOwnerId(ownerId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getByOwnerId", ownerId)
      return []
    },

    async getCurrentBookingsByOwner(ownerId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getCurrentBookingsByOwner", ownerId)
      return []
    },

    async getConfirmedBookingsByOwner(ownerId: string | number): Promise<any[]> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: getConfirmedBookingsByOwner", ownerId)
      return []
    },

    async reportDispute(bookingId: string | number, userId: string | number): Promise<any> {
      await simulateNetworkDelay()
      console.log("[v0] Mock API: reportDispute", bookingId, userId)
      return { message: "Dispute reported" }
    },
  },
}
