"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Clock, CheckCircle, XCircle, MapPin, Eye, Handshake } from "lucide-react"
import Image from "next/image"
import type { Property } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Booking {
  id: number
  userId: number
  propertyId: number | string
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  status: string
  requestedNegotiationPercent?: number
  negotiationExpiresAt?: string
}

interface BookingWithProperty extends Booking {
  property?: Property
}

interface PendingNegotiationsProps {
  ownerId: string | number
  onUpdate?: () => void
}

export function PendingNegotiations({ ownerId, onUpdate }: PendingNegotiationsProps) {
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingBooking, setViewingBooking] = useState<BookingWithProperty | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [ownerId])

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.bookings.getPendingNegotiations(parseInt(String(ownerId)))

      // Fetch property details for each booking
      const bookingsWithProperties = await Promise.all(
        data.map(async (booking: Booking) => {
          try {
            const property = await apiClient.properties.getById(String(booking.propertyId))
            return { ...booking, property }
          } catch {
            return { ...booking, property: undefined }
          }
        })
      )

      setBookings(bookingsWithProperties)
    } catch (err: any) {
      setError(err.message || "Failed to load pending negotiations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to accept this negotiation?")) {
      return
    }

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    setError("")

    try {
      await apiClient.bookings.acceptNegotiation(bookingId, parseInt(String(ownerId)))
      await fetchBookings()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to accept negotiation")
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const handleReject = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to reject this negotiation? The tenant can change the price.")) {
      return
    }

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    setError("")

    try {
      await apiClient.bookings.rejectNegotiation(bookingId, parseInt(String(ownerId)))
      await fetchBookings()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to reject negotiation")
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
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

  const getPropertyImage = (property?: Property) => {
    if (!property?.propertyImages || property.propertyImages.length === 0) {
      return null
    }
    const coverImage = property.propertyImages.find((img) => img.cover)
    return coverImage ? coverImage.url : property.propertyImages[0].url
  }

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return "/houses_placeholder.png"
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <p className="ml-4 text-gray-600">Loading pending negotiations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-700">{error}</p>
        <Button onClick={fetchBookings} variant="outline" className="mt-4">
          Try Again
        </Button>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Handshake className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No pending negotiations</h2>
        <p className="text-gray-600">You don't have any pending negotiation requests.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((booking) => {
          const imageUrl = getPropertyImage(booking.property)
          const nights = calculateNights(booking.checkInDate, booking.checkOutDate)

          return (
            <Card key={booking.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300">
              {/* Image Section */}
              <div className="relative h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 overflow-hidden">
                {imageUrl ? (
                  <Image
                    src={getImageUrl(imageUrl)}
                    alt={booking.property?.title || "Property"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-16 h-16 text-yellow-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Negotiation</Badge>
                </div>
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-yellow-600">
                      {booking.totalPrice?.toFixed(4) || "N/A"}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">ETH</span>
                  </div>
                  {booking.requestedNegotiationPercent && (
                    <p className="text-xs text-yellow-600 font-medium mt-1">
                      {booking.requestedNegotiationPercent}% discount
                    </p>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                  {booking.property?.title || `Property ${booking.propertyId}`}
                </h3>
                {booking.property?.address && (
                  <div className="flex items-center text-gray-600 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1.5 text-teal-600 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {booking.property.address.city}, {booking.property.address.country}
                    </span>
                  </div>
                )}

                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                      <span>Check-in</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatDate(booking.checkInDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                      <span>Check-out</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatDate(booking.checkOutDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-teal-600" />
                      <span>Duration</span>
                    </div>
                    <span className="font-semibold text-gray-900">{nights} {nights === 1 ? "night" : "nights"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleAccept(booking.id)}
                      disabled={actionLoading[booking.id]}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading[booking.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleReject(booking.id)}
                      disabled={actionLoading[booking.id]}
                      variant="destructive"
                      className="flex-1"
                    >
                      {actionLoading[booking.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      setViewingBooking(booking)
                      setViewModalOpen(true)
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Negotiation Details</DialogTitle>
          </DialogHeader>

          {viewingBooking && (
            <div className="space-y-6 mt-4">
              {/* Property Image */}
              {viewingBooking.property && getPropertyImage(viewingBooking.property) && (
                <div className="relative h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg overflow-hidden">
                  <Image
                    src={getImageUrl(getPropertyImage(viewingBooking.property))}
                    alt={viewingBooking.property.title || "Property"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 80vw"
                  />
                </div>
              )}

              {/* Property Info */}
              {viewingBooking.property && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{viewingBooking.property.title}</h3>
                  {viewingBooking.property.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 text-teal-600" />
                      <span>{viewingBooking.property.address.city}, {viewingBooking.property.address.country}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Booking Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Check-in</p>
                    <p className="text-base font-semibold text-gray-900">{formatDate(viewingBooking.checkInDate)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Check-out</p>
                    <p className="text-base font-semibold text-gray-900">{formatDate(viewingBooking.checkOutDate)}</p>
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Duration</span>
                    <span className="text-lg font-bold text-teal-700">
                      {calculateNights(viewingBooking.checkInDate, viewingBooking.checkOutDate)} {calculateNights(viewingBooking.checkInDate, viewingBooking.checkOutDate) === 1 ? "night" : "nights"}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-200">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Negotiated Price</span>
                    <span className="text-xl font-bold text-yellow-700">
                      {viewingBooking.totalPrice?.toFixed(4) || "N/A"} ETH
                    </span>
                  </div>
                  {viewingBooking.requestedNegotiationPercent && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-200">
                      <span className="text-sm text-gray-600">Negotiation</span>
                      <span className="text-sm font-semibold text-yellow-600">
                        {viewingBooking.requestedNegotiationPercent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={async () => {
                    setViewModalOpen(false)
                    await handleAccept(viewingBooking.id)
                  }}
                  disabled={actionLoading[viewingBooking.id]}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading[viewingBooking.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
                <Button
                  onClick={async () => {
                    setViewModalOpen(false)
                    await handleReject(viewingBooking.id)
                  }}
                  disabled={actionLoading[viewingBooking.id]}
                  variant="destructive"
                >
                  {actionLoading[viewingBooking.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

