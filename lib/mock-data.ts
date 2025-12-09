// Mock data for frontend development/testing without backend connection
// This file contains realistic sample data matching the actual API response schema

import type { Property, PropertyType, VerificationRequest, Amenity, Address, User } from "@/lib/types"

export const mockUsers = {
  poster: {
    id: "123",
    email: "poster@example.com",
    firstName: "John",
    lastName: "Doe",
    roles: ["POSTER"],
    phoneNumber: "+1234567890",
    birthday: "1990-01-15",
    verified: true,
  } as User,
  admin: {
    id: "456",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    roles: ["ADMIN"],
    phoneNumber: "+0987654321",
    birthday: "1985-05-20",
    verified: true,
  } as User,
}

export const mockAmenities: Amenity[] = [
  { id: 1, name: "WiFi" },
  { id: 2, name: "Air Conditioning" },
  { id: 3, name: "Parking" },
  { id: 4, name: "Fitness Center" },
  { id: 5, name: "Pool" },
  { id: 6, name: "Concierge" },
  { id: 7, name: "Laundry" },
  { id: 8, name: "Kitchen" },
]

export const mockPropertyTypes: PropertyType[] = [
  { id: 1, type: "Apartment" },
  { id: 2, type: "House" },
  { id: 3, type: "Studio" },
  { id: 4, type: "Condo" },
  { id: 5, type: "Villa" },
]

export const mockProperties: Property[] = [
  {
    id: "prop-1",
    userId: "123",
    title: "Luxury Downtown Apartment",
    description: "Beautiful renovated apartment with stunning city views and modern amenities",
    price: 1500,
    capacity: 4,
    numberOfBedrooms: 2,
    numberOfBathrooms: 1.5,
    numberOfBeds: 3,
    type: mockPropertyTypes[0],
    status: "APPROVED",
    address: {
      id: 1,
      address: "123 Main Street",
      city: "Downtown",
      country: "Morocco",
      zipCode: 10001,
      latitude: 33.9716,
      longitude: -6.8498,
    } as Address,
    propertyImages: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600",
        cover: true,
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600",
        cover: false,
      },
    ],
    amenities: mockAmenities.slice(0, 4),
    availabilities: [{ id: 1, startDate: "2024-12-01", endDate: "2025-06-30" }],
  } as Property,
  {
    id: "prop-2",
    userId: "123",
    title: "Cozy Studio Near Beach",
    description: "Comfortable studio apartment within walking distance to the beach",
    price: 950,
    capacity: 2,
    numberOfBedrooms: 1,
    numberOfBathrooms: 1,
    numberOfBeds: 1,
    type: mockPropertyTypes[2],
    status: "PENDING_APPROVAL",
    address: {
      id: 2,
      address: "456 Beach Road",
      city: "Beach District",
      country: "Morocco",
      zipCode: 20002,
      latitude: 33.9716,
      longitude: -6.8498,
    } as Address,
    propertyImages: [
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600",
        cover: true,
      },
    ],
    amenities: mockAmenities.slice(0, 2),
  } as Property,
  {
    id: "3",
    userId: "456",
    title: "Modern Penthouse with Rooftop",
    description: "Spectacular penthouse with rooftop terrace and panoramic city views",
    price: 3500,
    capacity: 6,
    numberOfBedrooms: 3,
    numberOfBathrooms: 2,
    numberOfBeds: 5,
    type: mockPropertyTypes[4],
    status: "APPROVED",
    address: {
      id: 3,
      address: "789 Business Avenue",
      city: "Business District",
      country: "Morocco",
      zipCode: 30003,
      latitude: 33.9716,
      longitude: -6.8498,
    } as Address,
    propertyImages: [
      {
        id: 4,
        url: "https://images.unsplash.com/photo-1545324418-cc1a9a6fded0?w=800&h=600",
        cover: true,
      },
    ],
    amenities: mockAmenities,
  } as Property,
]

export const mockVerificationRequests: VerificationRequest[] = [
  {
    id: 1,
    status: "PENDING",
    description: "Requesting verification for apartment listing",
    createdAt: "2024-11-18T10:30:00Z",
  },
  {
    id: 2,
    status: "APPROVED",
    description: "Property verification approved",
    response: "All documents verified successfully",
    createdAt: "2024-11-01T15:45:00Z",
  },
]

// Simulated delay to mimic real API calls
export const simulateNetworkDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))
