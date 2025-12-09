// Core user and auth types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  birthday?: string
  profileImage?: string
  walletAddress?: string
  roles: UserRole[]
  verified?: boolean
}

export type UserRole = "ADMIN" | "POSTER" | "USER"

// Property types
export type PropertyStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SUSPENDED"
  | "HIDDEN"
  | "VISIBLE_ONLY_FOR_TENANTS"
  | "PENDING_DELETE"
  | "DISAPPROVED"
  | "WAITING_FOR_UPDATE"

export interface Address {
  id?: number
  address: string
  city: string
  country: string
  zipCode?: number
  latitude?: number
  longitude?: number
}

export interface PropertyImage {
  id?: number
  url: string
  cover: boolean
}

export interface Amenity {
  id?: number
  name: string
  icon?: string
  category?: AmenityCategory
}

export interface AmenityCategory {
  id?: number
  title: string
  amenities?: Amenity[]
}

export interface Availability {
  id?: number
  startDate: string
  endDate: string
}

export interface Property {
  id: string
  userId: string
  status: PropertyStatus
  title: string
  description: string
  price: number
  dailyPrice?: number // Added for daily price in ETH
  depositAmount?: number // Security deposit amount in ETH
  negotiationPercentage?: number // Negotiation percentage (used as nicotine percentage for price calculation)
  capacity: number
  numberOfBedrooms?: number
  numberOfBathrooms?: number
  numberOfBeds?: number
  type?: PropertyType
  address: Address
  propertyImages: PropertyImage[]
  amenities: Amenity[]
  availabilities?: Availability[]
  verificationRequests?: VerificationRequest[]
  suspensions?: Suspension[]
}

export interface PropertyType {
  id: number
  type: string
}

export interface VerificationRequest {
  id: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  description: string
  response?: string
  createdAt: string
}

export interface Suspension {
  id: number
  reason: string
  createdAt: string
  active: boolean
}

// Request/Response DTOs
export interface CreatePropertyRequest {
  title: string
  description: string
  typeId: number
  dailyPrice: number
  depositAmount: number
  negotiationPercentage: number
  capacity: number
  numberOfBedrooms?: number
  numberOfBathrooms?: number
  numberOfBeds?: number
  address: Address
  amenities?: Amenity[]
  coverImageName?: string
  discountPlan?: {
    fiveDays?: number
    fifteenDays?: number
    oneMonth?: number
  } | null
}

export interface UpdatePropertyRequest {
  description?: string
  price?: number
  capacity?: number
  amenities?: Amenity[]
}

export interface ApprovePropertyRequest {
  isApproved: boolean
}
