"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Clock, CheckCircle, MapPin, Eye, AlertTriangle, X } from "lucide-react"
import Image from "next/image"
import type { Property } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface Booking {
  id: number
  userId: number
  propertyId: number | string
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  status: string
  longStayDiscountPercent?: number
}

interface BookingWithProperty extends Booking {
  property?: Property
}

interface CheckoutRequestsProps {
  ownerId: string | number
  onUpdate?: () => void
}

export function CheckoutRequests({ ownerId, onUpdate }: CheckoutRequestsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingBooking, setViewingBooking] = useState<BookingWithProperty | null>(null)
  const [reclamations, setReclamations] = useState<{ [key: number]: any }>({})

  useEffect(() => {
    fetchBookings()
  }, [ownerId])

  useEffect(() => {
    if (bookings.length > 0) {
      fetchReclamations()
    }
  }, [bookings])

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.bookings.getCurrentBookingsByOwner(parseInt(String(ownerId)))

      const checkoutRequests = data.filter((booking: Booking) => {
        return booking.status === "TENANT_CHECKED_OUT"
      })

      // Fetch property details for each booking
      const bookingsWithProperties = await Promise.all(
        checkoutRequests.map(async (booking: Booking) => {
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
      setError(err.message || "Failed to load checkout requests")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckout = async (bookingId: number) => {
    if (!window.confirm("Are you sure the tenant has checked out?")) {
      return
    }

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    setError("")

    try {
      const booking = bookings.find(b => b.id === bookingId)

      if (!booking) {
        setError("Booking not found")
        return
      }

      if (booking.status !== "TENANT_CHECKED_OUT") {
        const errorMsg = `Cannot confirm checkout. Booking status must be TENANT_CHECKED_OUT, but it is ${booking.status}`
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      // Note: We already filtered to only show TENANT_CHECKED_OUT bookings, so status should be correct

      const ownerIdNum = parseInt(String(ownerId))
      if (isNaN(ownerIdNum)) {
        throw new Error("Invalid owner ID. Please refresh the page and try again.")
      }

      // Use the dedicated owner endpoint
      await apiClient.bookings.ownerConfirmCheckout(bookingId, ownerIdNum)

      try {
        await apiClient.payments.completeBooking(bookingId)
        toast.success("Booking completed successfully on blockchain")
      } catch (blockchainErr: any) {
        toast.warning("Booking marked as completed, but blockchain transaction failed. Please contact support.")
      }

      toast.success("Checkout confirmed successfully")
      await fetchBookings()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      const errorMsg = err.message || "Failed to confirm checkout"
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const fetchReclamations = async () => {
    if (!user?.id) return

    try {
      const reclamationsMap: { [key: number]: any } = {}
      const currentUserId = parseInt(String(user.id))
      await Promise.all(
        bookings.map(async (booking) => {
          try {
            const reclamation = await apiClient.reclamations.getByBookingIdAndComplainant(
              booking.id,
              currentUserId
            )
            if (reclamation) {
              reclamationsMap[booking.id] = reclamation
            }
          } catch (err) {
            // Reclamation not found, ignore
          }
        })
      )
      setReclamations(reclamationsMap)
    } catch (err) {
      // Ignore errors
    }
  }

  const handleReclamation = (bookingId: number) => {
    router.push(`/reclamation/${bookingId}?isHost=true`)
  }

  const handleRemoveReclamation = async (bookingId: number, reclamationId: number) => {
    if (!window.confirm("Are you sure you want to remove this reclamation?")) {
      return
    }

    if (!user?.id) {
      setError("User not found")
      return
    }

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    setError("")

    try {
      const currentUserId = parseInt(String(user.id))
      await apiClient.reclamations.delete(reclamationId, currentUserId)
      setReclamations((prev) => {
        const newReclamations = { ...prev }
        delete newReclamations[bookingId]
        return newReclamations
      })
      toast.success("Reclamation removed successfully")
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to remove reclamation")
      toast.error(err.message || "Failed to remove reclamation")
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
        <p className="ml-4 text-gray-600">Loading checkout requests...</p>
      </div>
    )
  }

  if (error && !bookings.length) {
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
        <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No checkout requests</h2>
        <p className="text-gray-600">You don't have any bookings waiting for checkout confirmation.</p>
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
            <Card key={booking.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-purple-200">
              <div className="relative h-48 bg-gradient-to-br from-purple-100 to-purple-200 overflow-hidden">
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
                    <MapPin className="w-16 h-16 text-purple-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">Awaiting Confirmation</Badge>
                </div>
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-purple-600">
                      {booking.totalPrice?.toFixed(4) || "N/A"}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">MAD</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                  {booking.property?.title || `Property ${booking.propertyId}`}
                </h3>
                {booking.property?.address && (
                  <div className="flex items-center text-gray-600 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1.5 text-purple-600 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {booking.property.address.city}, {booking.property.address.country}
                    </span>
                  </div>
                )}

                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      <span>Check-in</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatDate(booking.checkInDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      <span>Check-out</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatDate(booking.checkOutDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      <span>Duration</span>
                    </div>
                    <span className="font-semibold text-gray-900">{nights} {nights === 1 ? "night" : "nights"}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleCheckout(booking.id)}
                    disabled={actionLoading[booking.id]}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading[booking.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Checkout
                      </>
                    )}
                  </Button>
                  {reclamations[booking.id] ? (
                    <Button
                      onClick={() => handleRemoveReclamation(booking.id, reclamations[booking.id].id)}
                      disabled={actionLoading[booking.id]}
                      variant="outline"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {actionLoading[booking.id] ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Remove Reclamation
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleReclamation(booking.id)}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Reclamation
                    </Button>
                  )}
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

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Checkout Request Details</DialogTitle>
          </DialogHeader>

          {viewingBooking && (
            <div className="space-y-6 mt-4">
              {viewingBooking.property && getPropertyImage(viewingBooking.property) && (
                <div className="relative h-48 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg overflow-hidden">
                  <Image
                    src={getImageUrl(getPropertyImage(viewingBooking.property))}
                    alt={viewingBooking.property.title || "Property"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 80vw"
                  />
                </div>
              )}

              {viewingBooking.property && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{viewingBooking.property.title}</h3>
                  {viewingBooking.property.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                      <span>{viewingBooking.property.address.city}, {viewingBooking.property.address.country}</span>
                    </div>
                  )}
                </div>
              )}

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
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Duration</span>
                    <span className="text-lg font-bold text-purple-700">
                      {calculateNights(viewingBooking.checkInDate, viewingBooking.checkOutDate)} {calculateNights(viewingBooking.checkInDate, viewingBooking.checkOutDate) === 1 ? "night" : "nights"}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Price</span>
                    <span className="text-xl font-bold text-purple-700">
                      {viewingBooking.totalPrice?.toFixed(0) || "N/A"} MAD
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={async () => {
                    setViewModalOpen(false)
                    await handleCheckout(viewingBooking.id)
                  }}
                  disabled={actionLoading[viewingBooking.id]}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading[viewingBooking.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Checkout
                    </>
                  )}
                </Button>
                {reclamations[viewingBooking.id] ? (
                  <Button
                    onClick={async () => {
                      setViewModalOpen(false)
                      await handleRemoveReclamation(viewingBooking.id, reclamations[viewingBooking.id].id)
                    }}
                    disabled={actionLoading[viewingBooking.id]}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {actionLoading[viewingBooking.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Remove Reclamation
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setViewModalOpen(false)
                      handleReclamation(viewingBooking.id)
                    }}
                    variant="outline"
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Reclamation
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

