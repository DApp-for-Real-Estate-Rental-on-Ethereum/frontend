"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/services/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Edit, 
  Trash2, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Property } from "@/lib/types"

interface Booking {
  id: number
  userId: number
  propertyId: number | string
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  status: string
  longStayDiscountPercent?: number
  requestedNegotiationPercent?: number
  negotiationExpiresAt?: string
  onChainTxHash?: string
  createdAt?: string
  updatedAt?: string
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    requestedPrice: "",
  })
  const [basePrice, setBasePrice] = useState<number | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<{
    pricePerNight?: number
    isNegotiable?: boolean
    discountEnabled?: boolean
    negotiationPercentage?: number
  } | null>(null)

  const bookingId = params.id as string

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
    }
  }, [bookingId])

  useEffect(() => {
    if (booking?.propertyId) {
      fetchProperty()
      fetchPropertyInfo()
    }
  }, [booking?.propertyId])

  useEffect(() => {
    if (isEditing && editForm.checkInDate && editForm.checkOutDate && propertyInfo?.pricePerNight) {
      calculateBasePrice()
    }
  }, [isEditing, editForm.checkInDate, editForm.checkOutDate, propertyInfo])

  const fetchBooking = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.bookings.getById(bookingId)
      setBooking(data)
      setEditForm({
        checkInDate: data.checkInDate || "",
        checkOutDate: data.checkOutDate || "",
        numberOfGuests: 1,
        requestedPrice: data.requestedNegotiationPercent ? "" : (data.totalPrice?.toString() || ""),
      })
    } catch (err: any) {
      console.error("Failed to fetch booking:", err)
      setError(err.message || "Failed to load booking details")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProperty = async () => {
    if (!booking?.propertyId) return
    try {
      const data = await apiClient.properties.getById(String(booking.propertyId))
      setProperty(data)
    } catch (err) {
      console.error("Failed to fetch property:", err)
    }
  }

  const fetchPropertyInfo = async () => {
    if (!booking?.propertyId) return
    try {
      const info = await apiClient.bookings.getPropertyInfo(String(booking.propertyId))
      setPropertyInfo(info)
    } catch (err) {
      console.error("Failed to fetch property info:", err)
    }
  }

  const calculateBasePrice = () => {
    if (!editForm.checkInDate || !editForm.checkOutDate || !propertyInfo?.pricePerNight) return

    try {
      const checkIn = new Date(editForm.checkInDate)
      const checkOut = new Date(editForm.checkOutDate)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      const calculatedPrice = Number(propertyInfo.pricePerNight) * nights
      setBasePrice(calculatedPrice)
    } catch (err) {
      console.error("Error calculating base price:", err)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (booking) {
      setEditForm({
        checkInDate: booking.checkInDate || "",
        checkOutDate: booking.checkOutDate || "",
        numberOfGuests: 1,
        requestedPrice: booking.requestedNegotiationPercent ? "" : (booking.totalPrice?.toString() || ""),
      })
    }
  }

  const handleUpdate = async () => {
    if (!booking) return

    // Validate dates
    if (!editForm.checkInDate || !editForm.checkOutDate) {
      setError("Please fill in all required fields")
      return
    }

    const checkIn = new Date(editForm.checkInDate)
    const checkOut = new Date(editForm.checkOutDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkIn < today) {
      setError("Check-in date must be today or later")
      return
    }

    if (checkOut <= checkIn) {
      setError("Check-out date must be after check-in date")
      return
    }

    setActionLoading(true)
    setError("")

    try {
      const updateData: any = {
        checkInDate: editForm.checkInDate,
        checkOutDate: editForm.checkOutDate,
        numberOfGuests: editForm.numberOfGuests,
      }

      if (editForm.requestedPrice) {
        updateData.requestedPrice = parseFloat(editForm.requestedPrice)
      }

      const response = await apiClient.bookings.update(booking.id, updateData)

      if (response.hasNegotiation === false && updateData.requestedPrice && basePrice) {
        // No negotiation - redirect to payment
        setTimeout(() => {
          router.push(`/payment?bookingId=${booking.id}`)
        }, 1000)
      } else {
        // Refresh booking
        await fetchBooking()
        setIsEditing(false)
      }
    } catch (err: any) {
      setError(err.message || "Failed to update booking")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!booking) return
    if (!window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      return
    }

    setActionLoading(true)
    setError("")

    try {
      await apiClient.bookings.delete(booking.id)
      router.push("/my-bookings")
    } catch (err: any) {
      setError(err.message || "Failed to cancel booking")
      setActionLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    } catch {
      return dateString
    }
  }

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0
    try {
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING_PAYMENT":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Awaiting Payment</Badge>
      case "PENDING_NEGOTIATION":
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmed</Badge>
      case "COMPLETED":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>
      case "TENANT_CHECKED_OUT":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Checked Out</Badge>
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>
    }
  }

  // Helper function to get property image
  const getPropertyImage = (property?: Property) => {
    if (!property?.propertyImages || property.propertyImages.length === 0) {
      return null
    }
    const coverImage = property.propertyImages.find((img) => img.cover)
    return coverImage ? coverImage.url : property.propertyImages[0].url
  }

  // Helper function to build full image URL
  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return "/placeholder.jpg"
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    if (url.startsWith("/uploads")) {
      return `http://localhost:8081${url}`
    }
    return url
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/my-bookings">
            <Button variant="outline">Back to Bookings</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist.</p>
          <Link href="/my-bookings">
            <Button variant="outline">Back to Bookings</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const nights = calculateNights(booking.checkInDate, booking.checkOutDate)
  const imageUrl = getPropertyImage(property)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link href="/my-bookings">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking #{booking.id}</h1>
          <div className="flex items-center gap-4">
            {getStatusBadge(booking.status)}
            {booking.onChainTxHash && (
              <Badge variant="outline" className="text-xs">
                Transaction: {booking.onChainTxHash.substring(0, 10)}...
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-red-200 bg-red-50">
            <p className="text-red-700 text-sm">{error}</p>
          </Card>
        )}

        {/* Property Image Section */}
        {property && imageUrl && (
          <Card className="mb-6 overflow-hidden">
            <div className="relative h-64 bg-gradient-to-br from-teal-100 to-teal-200">
              <Image
                src={getImageUrl(imageUrl)}
                alt={property.title || "Property"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h2>
              {property.address && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-teal-600" />
                  <span>{property.address.city}, {property.address.country}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {!isEditing ? (
              <>
                {/* Basic Information */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-teal-600" />
                    Booking Dates
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Check-in Date</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatDate(booking.checkInDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Check-out Date</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatDate(booking.checkOutDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm font-medium text-gray-600 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-teal-600" />
                        Duration
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {nights} {nights === 1 ? "night" : "nights"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Pricing Information */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-teal-600" />
                    Pricing Details
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Total Price</span>
                      <span className="text-2xl font-bold text-teal-600">
                        {booking.totalPrice?.toFixed(4) || "N/A"} ETH
                      </span>
                    </div>
                    {booking.longStayDiscountPercent && booking.longStayDiscountPercent > 0 && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Long Stay Discount</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {booking.longStayDiscountPercent}%
                        </span>
                      </div>
                    )}
                    {booking.requestedNegotiationPercent && booking.requestedNegotiationPercent > 0 && (
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm font-medium text-gray-600">Negotiation</span>
                        <span className="text-sm font-semibold text-yellow-600">
                          {booking.requestedNegotiationPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Booking Information */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Information</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Booking ID</span>
                      <span className="text-sm font-semibold text-gray-900">#{booking.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Property ID</span>
                      <span className="text-sm font-semibold text-gray-900">{booking.propertyId}</span>
                    </div>
                    {booking.createdAt && (
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm font-medium text-gray-600">Created At</span>
                        <span className="text-sm text-gray-900">{formatDate(booking.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              /* Edit Form */
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Booking</h2>
                <div className="space-y-6">
                  {/* Check-in Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      value={editForm.checkInDate}
                      onChange={(e) => setEditForm({ ...editForm, checkInDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  {/* Check-out Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Date *
                    </label>
                    <input
                      type="date"
                      value={editForm.checkOutDate}
                      onChange={(e) => setEditForm({ ...editForm, checkOutDate: e.target.value })}
                      min={editForm.checkInDate || new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  {/* Number of Guests */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.numberOfGuests}
                      onChange={(e) => setEditForm({ ...editForm, numberOfGuests: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  {/* Price Info */}
                  {basePrice && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Base Price:</strong> {basePrice.toFixed(4)} ETH
                      </p>
                      {propertyInfo?.negotiationPercentage && propertyInfo.negotiationPercentage > 0 && (
                        <p className="text-sm text-blue-800 mt-1">
                          <strong>Min Negotiation:</strong>{" "}
                          {(basePrice * (1 - propertyInfo.negotiationPercentage / 100)).toFixed(4)} ETH
                        </p>
                      )}
                    </div>
                  )}

                  {/* Requested Price */}
                  {propertyInfo?.negotiationPercentage && propertyInfo.negotiationPercentage > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Requested Price (ETH) - Leave empty for full price
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min={basePrice ? (basePrice * (1 - propertyInfo.negotiationPercentage / 100)).toFixed(4) : 0}
                        max={basePrice?.toFixed(4)}
                        value={editForm.requestedPrice}
                        onChange={(e) => setEditForm({ ...editForm, requestedPrice: e.target.value })}
                        placeholder={basePrice ? `Enter price (min: ${(basePrice * (1 - propertyInfo.negotiationPercentage / 100)).toFixed(4)} ETH)` : ""}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      {basePrice && editForm.requestedPrice && (
                        <p className="text-xs mt-1 text-gray-600">
                          {parseFloat(editForm.requestedPrice) >= basePrice
                            ? "✅ Full price - negotiation will be cancelled"
                            : parseFloat(editForm.requestedPrice) >= basePrice * (1 - propertyInfo.negotiationPercentage / 100)
                            ? "✅ Valid negotiation price"
                            : "⚠️ Price below minimum allowed"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleUpdate}
                      disabled={actionLoading}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      disabled={actionLoading}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Action Buttons */}
            {!isEditing && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-3">
                  {/* Edit Button */}
                  {(booking.status === "PENDING" || 
                    booking.status === "PENDING_PAYMENT" || 
                    booking.status === "PENDING_NEGOTIATION") && (
                    <Button
                      onClick={handleEdit}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Booking
                    </Button>
                  )}

                  {/* Pay Button */}
                  {(booking.status === "PENDING_PAYMENT" || 
                    (booking.status === "PENDING" && !booking.requestedNegotiationPercent)) && (
                    <Button
                      onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </Button>
                  )}

                  {/* Checkout Button */}
                  {booking.status === "CONFIRMED" && (
                    <Button
                      onClick={async () => {
                        if (!window.confirm("Are you sure you have checked out?")) return
                        setActionLoading(true)
                        try {
                          await apiClient.bookings.markAsCheckedOut(booking.id, parseInt(user!.id))
                          await fetchBooking()
                        } catch (err: any) {
                          setError(err.message || "Failed to confirm checkout")
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          I've Checked Out
                        </>
                      )}
                    </Button>
                  )}

                  {/* Delete Button */}
                  {(booking.status === "PENDING" || 
                    booking.status === "PENDING_PAYMENT" || 
                    booking.status === "PENDING_NEGOTIATION") && (
                    <Button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancel Booking
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Quick Info */}
            <Card className="p-6 bg-teal-50 border-teal-200">
              <h3 className="text-sm font-semibold text-teal-900 mb-3">Quick Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-teal-700">Status:</span>
                  <span className="font-medium text-teal-900">{booking.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">Nights:</span>
                  <span className="font-medium text-teal-900">{nights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">Total:</span>
                  <span className="font-medium text-teal-900">
                    {booking.totalPrice?.toFixed(4) || "N/A"} ETH
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

