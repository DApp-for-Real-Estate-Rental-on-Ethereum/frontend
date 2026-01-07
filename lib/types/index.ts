// Core user and auth types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  birthday?: string
  profileImage?: string
  profilePicture?: string // backend may return this field; keep for compatibility
  walletAddress?: string
  roles: UserRole[]
  verified?: boolean
  score?: number
  rating?: number
  enabled?: boolean
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

export interface TenantRiskFeatures {
  n_bookings_total: number
  n_completed_bookings: number
  n_cancelled_bookings: number
  avg_booking_value: number
  avg_stay_length_days: number
  recent_bookings_last_6m: number
  n_reclamations_as_target: number
  n_reclamations_low: number
  n_reclamations_medium: number
  n_reclamations_high: number
  n_reclamations_critical: number
  n_reclamations_open: number
  n_reclamations_resolved_against_user: number
  total_penalty_points: number
  total_refund_amount: number
  n_transactions_total: number
  n_transactions_success: number
  n_transactions_failed: number
  failed_transaction_rate: number
  avg_transaction_amount: number
  user_rating: number
  user_score: number
  user_penalty_points: number
  is_suspended: boolean
  account_age_days: number
  has_verified_profile: boolean
}

export interface TenantRiskResponse {
  tenant_id: number
  trust_score: number
  risk_band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  risk_probability: number
  top_factors: string[]
  features: TenantRiskFeatures
}

// Market Trends Types
export interface TrendDataPoint {
  period: string; // YYYY-MM
  avg_price_mad: number;
  occupancy_rate: number;
  n_bookings: number;
  n_cancellations: number;
  avg_stay_length_days: number;
}

export interface CityTrendResponse {
  city: string;
  period_start: string;
  period_end: string;
  data_points: TrendDataPoint[];
  trend_direction: "RISING" | "STABLE" | "DECLINING";
  price_change_percent: number;
  avg_occupancy: number;
}

export interface MarketInsight {
  city: string;
  insight_type: "PRICE_FORECAST" | "OCCUPANCY_FORECAST" | "SEASONALITY";
  message: string;
  confidence: number;
  data: any;
}

export interface MarketTrendsResponse {
  trends: CityTrendResponse[];
  insights: MarketInsight[];
  generated_at: string;
}

// Booking Types
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "TENANT_CHECKED_OUT"
  | "WAITING_FOR_PAYMENT"
  | "PAYMENT_FAILED"
  | "REFUNDED"
  | "DISPUTED"

export interface Booking {
  id: number
  userId: number
  propertyId: string
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  status: BookingStatus
  longStayDiscountPercent?: number
  requestedNegotiationPercent?: number
  negotiationExpiresAt?: string
  onChainTxHash?: string
  createdAt?: string
  updatedAt?: string
  hasNegotiation?: boolean
}

export interface BookingRequest {
  userId: number | string
  propertyId: string
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  requestedPrice?: number
}

export type NegotiationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED"

export type PropertyRequest = CreatePropertyRequest;
