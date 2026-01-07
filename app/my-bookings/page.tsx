"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/services/api"
import { resolveMediaUrl } from "@/lib/services/api/core"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Users, MapPin, CheckCircle, Clock, XCircle, ExternalLink, Edit, Trash2, CreditCard, Eye, X, AlertTriangle, Phone, Building2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Property } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  requestedNegotiationPercent?: number
  negotiationExpiresAt?: string
  onChainTxHash?: string
}

interface BookingWithProperty extends Booking {
  property?: Property
}

export default function MyBookingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [currentBooking, setCurrentBooking] = useState<BookingWithProperty | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})
  const [loadingProperties, setLoadingProperties] = useState<{ [key: string]: boolean }>({})

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<BookingWithProperty | null>(null)
  const [editFormData, setEditFormData] = useState({
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    requestedPrice: undefined as string | undefined,
  })

  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingBooking, setViewingBooking] = useState<BookingWithProperty | null>(null)
  const [reclamations, setReclamations] = useState<{ [key: number]: any }>({})
  const [myComplaints, setMyComplaints] = useState<any[]>([])
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [hostPhoneNumbers, setHostPhoneNumbers] = useState<{ [key: number]: string | null }>({})
  const [loadingHostPhones, setLoadingHostPhones] = useState<{ [key: number]: boolean }>({})
  const [complaintProperties, setComplaintProperties] = useState<{ [key: number]: any }>({})
  const [complaintPhoneNumbers, setComplaintPhoneNumbers] = useState<{ [key: number]: string | null }>({})
  const [loadingComplaintData, setLoadingComplaintData] = useState<{ [key: number]: boolean }>({})

  // Get active tab from URL query parameter, default to "current"
  const activeTab = searchParams.get("tab") || "current"

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return
    }

    // Only redirect if auth is finished loading and user is not authenticated
    if (!isAuthenticated || !user) {
      router.push("/login?redirect=/my-bookings")
      return
    }

    // User is authenticated, fetch bookings based on active tab
    fetchBookings()

    // Fetch complaints if on complaints tab
    if (activeTab === "complaints") {
      fetchMyComplaints()
    }
  }, [user, isAuthenticated, authLoading, router, activeTab])

  // Fetch property details for a booking
  const fetchPropertyForBooking = async (booking: Booking): Promise<BookingWithProperty> => {
    try {
      setLoadingProperties((prev) => ({ ...prev, [String(booking.propertyId)]: true }))
      const property = await apiClient.properties.getById(String(booking.propertyId))
      return { ...booking, property }
    } catch (err) {
      return { ...booking, property: undefined }
    } finally {
      setLoadingProperties((prev) => ({ ...prev, [String(booking.propertyId)]: false }))
    }
  }

  const fetchBookings = async () => {
    if (!user?.id) {
      return
    }

    try {
      setIsLoading(true)
      setError("")

      let bookingsData: Booking[] = []
      let currentBookingLocal: BookingWithProperty | null = null

      switch (activeTab) {
        case "current":
          const current = await apiClient.bookings.getCurrentBooking(parseInt(user.id))
          if (current) {
            const currentWithProperty = await fetchPropertyForBooking(current)
            currentBookingLocal = currentWithProperty
            setCurrentBooking(currentWithProperty)
          } else {
            setCurrentBooking(null)
          }
          setBookings([])
          break
        case "pending":
          const pending = await apiClient.bookings.getPendingBookings(parseInt(user.id))
          if (!pending || pending.length === 0) {
            const all = await apiClient.bookings.getByTenantId(parseInt(user.id))
            const filtered = (all || []).filter((b: any) =>
              b.status === "PENDING_NEGOTIATION" ||
              (b.status === "PENDING" && b.requestedNegotiationPercent != null && b.requestedNegotiationPercent > 0)
            )
            bookingsData = filtered
          } else {
            bookingsData = pending || []
          }
          break
        case "payment":
          const payment = await apiClient.bookings.getAwaitingPaymentBookings(parseInt(user.id))
          if (!payment || payment.length === 0) {
            const all = await apiClient.bookings.getByTenantId(parseInt(user.id))
            const filtered = (all || []).filter((b: any) =>
              b.status === "PENDING_PAYMENT" ||
              (b.status === "PENDING" && (b.requestedNegotiationPercent == null || b.requestedNegotiationPercent === 0))
            )
            bookingsData = filtered
          } else {
            bookingsData = payment || []
          }
          break
        case "rejected":
          const allForRejected = await apiClient.bookings.getByTenantId(parseInt(user.id))
          const rejectedFiltered = (allForRejected || []).filter((b: any) =>
            b.status === "NEGOTIATION_REJECTED"
          )
          bookingsData = rejectedFiltered
          break
        case "complaints":
          bookingsData = []
          break
        default:
          const all = await apiClient.bookings.getByTenantId(parseInt(user.id))
          bookingsData = all || []
      }

      // Fetch property details for all bookings
      if (bookingsData.length > 0) {
        const bookingsWithProperties = await Promise.all(
          bookingsData.map((booking) => fetchPropertyForBooking(booking))
        )
        setBookings(bookingsWithProperties)
      } else {
        setBookings([])
      }

      if (activeTab !== "current") {
        setCurrentBooking(null)
        currentBookingLocal = null
      }

      // Fetch reclamations for bookings
      if (bookingsData.length > 0 || currentBookingLocal) {
        await fetchReclamations(bookingsData, currentBookingLocal)
      }

      const confirmedBookings = [...(currentBookingLocal ? [currentBookingLocal] : []), ...bookingsData].filter(
        (b) => b.status === "CONFIRMED"
      )

      if (confirmedBookings.length > 0) {
        await fetchHostPhoneNumbers(confirmedBookings)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bookings")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyComplaints = async () => {
    if (!user?.id) return

    setComplaintsLoading(true)
    try {
      const complaints = await apiClient.reclamations.getMyComplaints(parseInt(user.id))
      setMyComplaints(complaints || [])

      // Fetch property and phone number data for each complaint
      if (complaints && complaints.length > 0) {
        await fetchComplaintDetails(complaints)
      }
    } catch (err: any) {
      setMyComplaints([])
    } finally {
      setComplaintsLoading(false)
    }
  }

  const fetchComplaintDetails = async (complaints: any[]) => {
    try {
      const propertiesMap: { [key: number]: any } = {}
      const phoneNumbersMap: { [key: number]: string | null } = {}

      await Promise.all(
        complaints.map(async (complaint) => {
          try {
            setLoadingComplaintData((prev) => ({ ...prev, [complaint.id]: true }))

            // Fetch booking to get propertyId
            try {
              const booking = await apiClient.bookings.getById(complaint.bookingId)
              if (booking && booking.propertyId) {
                // Fetch property details
                let property = null
                try {
                  property = await apiClient.properties.getById(String(booking.propertyId))
                  propertiesMap[complaint.id] = property
                } catch (err) {
                  // Ignore property fetch errors
                }

                try {
                  if (property?.userId) {
                    const hostInfo = await apiClient.users.getById(parseInt(String(property.userId)))
                    if (hostInfo.phoneNumber) {
                      phoneNumbersMap[complaint.id] = String(hostInfo.phoneNumber)
                    }
                  } else {
                    const propertyInfo = await apiClient.bookings.getPropertyInfo(String(booking.propertyId))
                    if (propertyInfo.ownerId) {
                      const hostInfo = await apiClient.users.getById(parseInt(String(propertyInfo.ownerId)))
                      if (hostInfo.phoneNumber) {
                        phoneNumbersMap[complaint.id] = String(hostInfo.phoneNumber)
                      }
                    }
                  }
                } catch (err) {
                  // Ignore phone fetch errors
                }
              }
            } catch (err) {
              // Ignore booking fetch errors
            }
          } catch (err) {
            // Ignore detail fetch errors
          } finally {
            setLoadingComplaintData((prev) => ({ ...prev, [complaint.id]: false }))
          }
        })
      )

      setComplaintProperties((prev) => ({ ...prev, ...propertiesMap }))
      setComplaintPhoneNumbers((prev) => ({ ...prev, ...phoneNumbersMap }))
    } catch (err) {
      // Ignore errors
    }
  }

  const fetchReclamations = async (bookingsList: Booking[], current?: BookingWithProperty | null) => {
    if (!user?.id) return

    try {
      const reclamationsMap: { [key: number]: any } = {}
      const bookingsToCheck = current ? [current, ...bookingsList] : bookingsList

      await Promise.all(
        bookingsToCheck.map(async (booking) => {
          try {
            const reclamation = await apiClient.reclamations.getByBookingIdAndComplainant(
              booking.id,
              parseInt(user.id)
            )
            // Only track reclamations opened by the current user; ignore host-side complaints
            if (reclamation && String(reclamation.complainantId) === String(user.id)) {
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

  const fetchHostPhoneNumbers = async (bookings: BookingWithProperty[]) => {
    try {
      const phoneNumbersMap: { [key: number]: string | null } = {}

      await Promise.all(
        bookings.map(async (booking) => {
          try {
            setLoadingHostPhones((prev) => ({ ...prev, [booking.id]: true }))

            if (booking.property?.userId) {
              const ownerId = parseInt(String(booking.property.userId))
              try {
                const ownerInfo = await apiClient.users.getById(ownerId)
                if (ownerInfo && ownerInfo.phoneNumber !== null && ownerInfo.phoneNumber !== undefined) {
                  const phoneStr = String(ownerInfo.phoneNumber)
                  phoneNumbersMap[booking.id] = phoneStr
                } else {
                  phoneNumbersMap[booking.id] = null
                }
              } catch (err) {
                phoneNumbersMap[booking.id] = null
              }
            } else {
              try {
                const propertyInfo = await apiClient.bookings.getPropertyInfo(String(booking.propertyId))
                if (propertyInfo.ownerId) {
                  const ownerInfo = await apiClient.users.getById(parseInt(String(propertyInfo.ownerId)))
                  if (ownerInfo && ownerInfo.phoneNumber !== null && ownerInfo.phoneNumber !== undefined) {
                    const phoneStr = String(ownerInfo.phoneNumber)
                    phoneNumbersMap[booking.id] = phoneStr
                  } else {
                    phoneNumbersMap[booking.id] = null
                  }
                } else {
                  phoneNumbersMap[booking.id] = null
                }
              } catch (err) {
                phoneNumbersMap[booking.id] = null
              }
            }
          } catch (err) {
            phoneNumbersMap[booking.id] = null
          } finally {
            setLoadingHostPhones((prev) => ({ ...prev, [booking.id]: false }))
          }
        })
      )

      setHostPhoneNumbers((prev) => ({ ...prev, ...phoneNumbersMap }))
    } catch (err) {
      // Ignore errors
    }
  }

  const handleReclamation = (bookingId: number) => {
    router.push(`/reclamation/${bookingId}?isHost=false`)
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
      await apiClient.reclamations.delete(reclamationId, parseInt(user.id))
      // Remove from local state
      setReclamations((prev) => {
        const newReclamations = { ...prev }
        delete newReclamations[bookingId]
        return newReclamations
      })
      await fetchBookings()
    } catch (err: any) {
      setError(err.message || "Failed to remove reclamation")
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const handleTabChange = (tab: string) => {
    router.push(`/my-bookings?tab=${tab}`)
  }

  const handleCheckout = async (bookingId: number) => {
    if (!window.confirm("Are you sure you have checked out?")) {
      return
    }

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    setError("")

    try {
      // Use tenantCheckout endpoint (changes status from CONFIRMED to TENANT_CHECKED_OUT)
      await apiClient.bookings.tenantCheckout(bookingId, parseInt(user!.id))
      toast.success("Checkout confirmed! Waiting for host confirmation.")
      // Refresh booking data
      await fetchBookings()
    } catch (err: any) {
      const errorMsg = err.message || "Failed to confirm checkout"
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const handlePay = (bookingId: number) => {
    router.push(`/payment?bookingId=${bookingId}`)
  }

  const handleDelete = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      return
    }

    if (!user?.id) {
      setError("User not found")
      return
    }

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }))
    setError("")
    try {
      await apiClient.bookings.delete(bookingId, parseInt(user.id))
      // Refresh booking data
      await fetchBookings()
    } catch (err: any) {
      setError(err.message || "Failed to cancel booking")
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  const handleEdit = (booking: BookingWithProperty) => {
    setEditingBooking(booking)
    // Format dates for input (YYYY-MM-DD)
    // Use local date formatting to avoid timezone issues with toISOString()
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return ""
      try {
        const date = new Date(dateString)
        // Use local date components to avoid timezone conversion issues
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch {
        return dateString
      }
    }
    setEditFormData({
      checkInDate: formatDateForInput(booking.checkInDate),
      checkOutDate: formatDateForInput(booking.checkOutDate),
      numberOfGuests: 1, // Default, can be updated if API provides it
      requestedPrice: (booking.requestedNegotiationPercent || booking.status === "NEGOTIATION_REJECTED")
        ? booking.totalPrice?.toString()
        : undefined,
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingBooking) return

    // Validate dates
    if (!editFormData.checkInDate || !editFormData.checkOutDate) {
      setError("Please fill in all required fields")
      return
    }

    const checkIn = new Date(editFormData.checkInDate)
    const checkOut = new Date(editFormData.checkOutDate)
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

    setActionLoading((prev) => ({ ...prev, [editingBooking.id]: true }))
    setError("")

    try {
      // Validate requested price
      if (editFormData.requestedPrice) {
        const price = parseFloat(editFormData.requestedPrice)
        if (isNaN(price) || price <= 0) {
          setError("Requested price must be greater than 0")
          setActionLoading((prev) => ({ ...prev, [editingBooking.id]: false }))
          return
        }
      } else if (editingBooking.status === "NEGOTIATION_REJECTED") {
        // If booking is rejected, requested price is required
        setError("Please enter a requested price")
        setActionLoading((prev) => ({ ...prev, [editingBooking.id]: false }))
        return
      }

      const result: any = await apiClient.bookings.update(editingBooking.id, {
        checkInDate: editFormData.checkInDate,
        checkOutDate: editFormData.checkOutDate,
        numberOfGuests: editFormData.numberOfGuests,
        requestedPrice: editFormData.requestedPrice ? parseFloat(editFormData.requestedPrice) : undefined,
      })

      // Check if update was rejected
      if (result?.status === "rejected" || result?.error === "PRICE_TOO_LOW") {
        setError(result?.message || "Price is not acceptable. Please increase it.")
        return
      }

      setIsEditModalOpen(false)
      setEditingBooking(null)
      setError("")
      // Refresh booking data
      await fetchBookings()
    } catch (err: any) {
      // Parse error message from response
      let errorMessage = "Failed to update booking"

      if (err.message) {
        if (err.message.includes("Price is not acceptable")) {
          errorMessage = err.message
        } else if (err.message.includes("PRICE_TOO_LOW")) {
          errorMessage = "Price is not acceptable. Please increase it."
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setActionLoading((prev) => ({ ...prev, [editingBooking.id]: false }))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING_PAYMENT":
        return <Badge className="bg-blue-100/80 text-blue-800 border-blue-200 backdrop-blur-sm">Awaiting Payment</Badge>
      case "PENDING_NEGOTIATION":
        return <Badge className="bg-yellow-100/80 text-yellow-800 border-yellow-200 backdrop-blur-sm">Pending Negotiation</Badge>
      case "NEGOTIATION_REJECTED":
        return <Badge className="bg-orange-100/80 text-orange-800 border-orange-200 backdrop-blur-sm">Negotiation Rejected</Badge>
      case "CONFIRMED":
        return <Badge className="bg-green-100/80 text-green-800 border-green-200 backdrop-blur-sm">Confirmed</Badge>
      case "COMPLETED":
        return <Badge className="bg-gray-100/80 text-gray-800 border-gray-200 backdrop-blur-sm">Completed</Badge>
      case "TENANT_CHECKED_OUT":
        return <Badge className="bg-purple-100/80 text-purple-800 border-purple-200 backdrop-blur-sm">Checked Out</Badge>
      case "IN_DISPUTE":
        return <Badge className="bg-red-100/80 text-red-800 border-red-200 backdrop-blur-sm">In Dispute</Badge>
      case "CANCELLED_BY_HOST":
        return <Badge className="bg-red-100/80 text-red-800 border-red-200 backdrop-blur-sm">Cancelled by Host</Badge>
      case "CANCELLED_BY_TENANT":
        return <Badge className="bg-red-100/80 text-red-800 border-red-200 backdrop-blur-sm">Cancelled</Badge>
      case "PENDING":
        // Legacy status - show as pending
        return <Badge className="bg-yellow-100/80 text-yellow-800 border-yellow-200 backdrop-blur-sm">Pending</Badge>
      default:
        return <Badge className="bg-gray-100/80 text-gray-800 border-gray-200 backdrop-blur-sm">{status}</Badge>
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
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return 0
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
    return resolveMediaUrl(url, "/placeholder.jpg")
  }

  // Render beautiful booking card
  const renderBookingCard = (booking: BookingWithProperty, isCurrent = false, currentTab = activeTab) => {
    const property = booking.property
    const imageUrl = getPropertyImage(property)
    const nights = calculateNights(booking.checkInDate, booking.checkOutDate)
    const isLoadingProperty = loadingProperties[String(booking.propertyId)]

    return (
      <Card
        key={booking.id}
        className={`overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl ${isCurrent ? "max-w-2xl mx-auto" : ""
          }`}
      >
        {/* Image Section */}
        <div className="relative h-64 bg-gradient-to-br from-teal-100 to-cyan-200 overflow-hidden">
          {isLoadingProperty ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : imageUrl ? (
            <Image
              src={getImageUrl(imageUrl)}
              alt={property?.title || "Property"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-16 h-16 text-teal-300" />
            </div>
          )}

          {/* Status Badge Overlay */}
          <div className="absolute top-4 right-4">
            {getStatusBadge(booking.status)}
          </div>

          {/* Price Badge Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-teal-600">
                {booking.totalPrice?.toFixed(4) || "N/A"}
              </span>
              <span className="text-sm font-semibold text-gray-600">MAD</span>
            </div>
            {booking.requestedNegotiationPercent && booking.requestedNegotiationPercent > 0 && (
              <p className="text-xs text-yellow-600 font-medium mt-1">
                Negotiated: {booking.requestedNegotiationPercent}%
              </p>
            )}
            {booking.longStayDiscountPercent && booking.longStayDiscountPercent > 0 && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                Discount: {booking.longStayDiscountPercent}%
              </p>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Property Title and Location */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
              {property?.title || `Property ${booking.propertyId}`}
            </h3>
            {property?.address && (
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mr-1.5 text-teal-600 flex-shrink-0" />
                <span className="line-clamp-1">
                  {property.address.city}, {property.address.country}
                </span>
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600 text-sm">
                <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                <span className="font-medium">Check-in</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatDate(booking.checkInDate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600 text-sm">
                <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                <span className="font-medium">Check-out</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatDate(booking.checkOutDate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600 text-sm">
                <Clock className="w-4 h-4 mr-2 text-teal-600" />
                <span className="font-medium">Duration</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {nights} {nights === 1 ? "night" : "nights"}
              </span>
            </div>
            {/* Host Phone Number - Show for CONFIRMED bookings */}
            {booking.status === "CONFIRMED" && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center text-gray-600 text-sm">
                  <Phone className="w-4 h-4 mr-2 text-teal-600" />
                  <span className="font-medium">Host Phone</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {loadingHostPhones[booking.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : hostPhoneNumbers[booking.id] ? (
                    hostPhoneNumbers[booking.id]
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Payment Button - Show for PENDING_PAYMENT */}
            {booking.status === "PENDING_PAYMENT" && (
              <Button
                onClick={() => handlePay(booking.id)}
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}

            {/* Negotiation Rejected - Show in rejected tab with edit option */}
            {booking.status === "NEGOTIATION_REJECTED" && (
              <>
                <div className="w-full p-3 bg-orange-50 border-2 border-orange-200 rounded-lg mb-2">
                  <p className="text-sm font-medium text-orange-800 text-center mb-2">
                    ⚠️ Your negotiation was rejected by the host
                  </p>
                  <p className="text-xs text-orange-700 text-center">
                    You can change the price and resubmit, or cancel the booking
                  </p>
                </div>
                <Button
                  onClick={() => handleEdit(booking)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white mb-2"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Change Price
                </Button>
              </>
            )}

            {/* Checkout Button - Show for CONFIRMED (Current Booking tab only) */}
            {booking.status === "CONFIRMED" && currentTab === "current" && (
              <Button
                onClick={() => handleCheckout(booking.id)}
                disabled={actionLoading[booking.id]}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white mb-2 shadow-md hover:shadow-lg transition-all"
              >
                {actionLoading[booking.id] ? (
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

            {/* Reclamation Button - Show for CONFIRMED (Current Booking tab only) */}
            {booking.status === "CONFIRMED" && currentTab === "current" && (
              <>
                {reclamations[booking.id] ? (
                  <Button
                    onClick={() => handleRemoveReclamation(booking.id, reclamations[booking.id].id)}
                    disabled={actionLoading[booking.id]}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 mb-2"
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
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 mb-2"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Reclamation
                  </Button>
                )}
              </>
            )}

            {/* Waiting Message - Show for TENANT_CHECKED_OUT */}
            {booking.status === "TENANT_CHECKED_OUT" && (
              <div className="w-full p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-center">
                <p className="text-sm font-medium text-yellow-800">
                  ⏳ Waiting for host to confirm checkout
                </p>
              </div>
            )}

            {/* View Button */}
            <Button
              onClick={() => {
                setViewingBooking(booking)
                setViewModalOpen(true)
              }}
              variant="outline"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>

            {/* Edit Button - Show for PENDING_NEGOTIATION and PENDING_PAYMENT (not for rejected in this section) */}
            {(booking.status === "PENDING_PAYMENT" ||
              booking.status === "PENDING_NEGOTIATION") && (
                <Button
                  onClick={() => handleEdit(booking)}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}

            {/* Delete Button - Show for cancellable statuses */}
            {(booking.status === "PENDING_PAYMENT" ||
              booking.status === "PENDING_NEGOTIATION" ||
              booking.status === "NEGOTIATION_REJECTED") && (
                <Button
                  onClick={() => handleDelete(booking.id)}
                  disabled={actionLoading[booking.id]}
                  variant="destructive"
                  className={booking.status === "NEGOTIATION_REJECTED" ? "w-full" : "flex-1"}
                >
                  {actionLoading[booking.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
          </div>
        </div>
      </Card>
    )
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, will redirect (don't render anything)
  if (!isAuthenticated || !user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation Bar - Search Bar Style */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex items-stretch divide-x divide-gray-200">
              {/* Create New Booking - Links to Properties */}
              <Link
                href="/properties"
                className="flex-1 px-6 py-4 text-center transition-colors hover:bg-gray-50"
              >
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1 text-gray-900">
                    Create
                  </label>
                  <span className="text-sm text-gray-600">
                    New Booking
                  </span>
                </div>
              </Link>

              {/* Current Booking */}
              <button
                onClick={() => handleTabChange("current")}
                className={`flex-1 px-6 py-4 text-center transition-colors ${activeTab === "current"
                  ? "bg-teal-600 text-white"
                  : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex flex-col">
                  <label className={`text-xs font-semibold mb-1 ${activeTab === "current"
                    ? "text-white"
                    : "text-gray-900"
                    }`}>
                    Current
                  </label>
                  <span className={`text-sm ${activeTab === "current"
                    ? "text-white"
                    : "text-gray-600"
                    }`}>
                    Booking
                  </span>
                </div>
              </button>

              {/* Pending Negotiations */}
              <button
                onClick={() => handleTabChange("pending")}
                className={`flex-1 px-6 py-4 text-center transition-colors ${activeTab === "pending"
                  ? "bg-teal-600 text-white"
                  : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex flex-col">
                  <label className={`text-xs font-semibold mb-1 ${activeTab === "pending"
                    ? "text-white"
                    : "text-gray-900"
                    }`}>
                    Pending
                  </label>
                  <span className={`text-sm ${activeTab === "pending"
                    ? "text-white"
                    : "text-gray-600"
                    }`}>
                    Negotiations
                  </span>
                </div>
              </button>

              {/* Awaiting Payment */}
              <button
                onClick={() => handleTabChange("payment")}
                className={`flex-1 px-6 py-4 text-center transition-colors ${activeTab === "payment"
                  ? "bg-teal-600 text-white"
                  : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex flex-col">
                  <label className={`text-xs font-semibold mb-1 ${activeTab === "payment"
                    ? "text-white"
                    : "text-gray-900"
                    }`}>
                    Awaiting
                  </label>
                  <span className={`text-sm ${activeTab === "payment"
                    ? "text-white"
                    : "text-gray-600"
                    }`}>
                    Payment
                  </span>
                </div>
              </button>

              {/* Rejected Negotiations */}
              <button
                onClick={() => handleTabChange("rejected")}
                className={`flex-1 px-6 py-4 text-center transition-colors ${activeTab === "rejected"
                  ? "bg-teal-600 text-white"
                  : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex flex-col">
                  <label className={`text-xs font-semibold mb-1 ${activeTab === "rejected"
                    ? "text-white"
                    : "text-gray-900"
                    }`}>
                    Rejected
                  </label>
                  <span className={`text-sm ${activeTab === "rejected"
                    ? "text-white"
                    : "text-gray-600"
                    }`}>
                    Negotiations
                  </span>
                </div>
              </button>

              {/* My Complaints */}
              <button
                onClick={() => handleTabChange("complaints")}
                className={`flex-1 px-6 py-4 text-center transition-colors rounded-r-2xl ${activeTab === "complaints"
                  ? "bg-teal-600 text-white"
                  : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex flex-col">
                  <label className={`text-xs font-semibold mb-1 ${activeTab === "complaints"
                    ? "text-white"
                    : "text-gray-900"
                    }`}>
                    My
                  </label>
                  <span className={`text-sm ${activeTab === "complaints"
                    ? "text-white"
                    : "text-gray-600"
                    }`}>
                    Complaints
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activeTab === "current" && "Current Booking"}
            {activeTab === "pending" && "Pending Negotiations"}
            {activeTab === "payment" && "Awaiting Payment"}
            {activeTab === "rejected" && "Rejected Negotiations"}
            {activeTab === "complaints" && "My Complaints"}
          </h1>
          <p className="text-gray-600">
            {activeTab === "current" && "Your active confirmed booking - You can check out when ready"}
            {activeTab === "pending" && "Bookings waiting for host approval - Your negotiation requests"}
            {activeTab === "payment" && "Bookings waiting for payment - Complete payment to confirm"}
            {activeTab === "rejected" && "Rejected negotiations - Edit the price or cancel"}
            {activeTab === "complaints" && "View and manage your complaints"}
          </p>
        </div>

        {error && (
          <Card className="p-6 mb-6 border-red-200 bg-red-50">
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchBookings} variant="outline" className="mt-4">
              Try Again
            </Button>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            <p className="ml-4 text-gray-600">Loading bookings...</p>
          </div>
        ) : (
          <>
            {/* Current Booking Tab - Single Booking Display */}
            {activeTab === "current" && (
              <>
                {!currentBooking ? (
                  <Card className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No current booking</h2>
                    <p className="text-gray-600 mb-6">You don't have an active booking at the moment.</p>
                    <Link href="/properties">
                      <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
                    </Link>
                  </Card>
                ) : (
                  renderBookingCard(currentBooking, true)
                )}
              </>
            )}

            {/* Pending Negotiations Tab - Only PENDING_NEGOTIATION */}
            {activeTab === "pending" && (
              <>
                {bookings.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No pending negotiations</h2>
                    <p className="text-gray-600 mb-6">You don't have any negotiations waiting for host approval.</p>
                    <Link href="/properties">
                      <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map((booking) => renderBookingCard(booking))}
                  </div>
                )}
              </>
            )}

            {/* Awaiting Payment Tab - Only PENDING_PAYMENT */}
            {activeTab === "payment" && (
              <>
                {bookings.length === 0 ? (
                  <Card className="p-12 text-center">
                    <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No bookings awaiting payment</h2>
                    <p className="text-gray-600 mb-6">You don't have any bookings waiting for payment.</p>
                    <Link href="/properties">
                      <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map((booking) => renderBookingCard(booking))}
                  </div>
                )}
              </>
            )}

            {/* Rejected Negotiations Tab - Only NEGOTIATION_REJECTED */}
            {activeTab === "rejected" && (
              <>
                {bookings.length === 0 ? (
                  <Card className="p-12 text-center">
                    <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No rejected negotiations</h2>
                    <p className="text-gray-600 mb-6">You don't have any rejected negotiations.</p>
                    <Link href="/properties">
                      <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map((booking) => renderBookingCard(booking))}
                  </div>
                )}
              </>
            )}

            {/* Complaints Tab */}
            {activeTab === "complaints" && (
              <>
                {complaintsLoading ? (
                  <Card className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading complaints...</p>
                  </Card>
                ) : myComplaints.length === 0 ? (
                  <Card className="p-12 text-center">
                    <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No complaints</h2>
                    <p className="text-gray-600">You haven't filed any complaints yet.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myComplaints.map((complaint) => {
                      const property = complaintProperties[complaint.id]
                      const phoneNumber = complaintPhoneNumbers[complaint.id]
                      const isLoadingDetails = loadingComplaintData[complaint.id]

                      return (
                        <Card key={complaint.id} className="p-6 hover:shadow-lg transition-shadow">
                          <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="mb-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">{complaint.title}</h3>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  className={
                                    complaint.status === "OPEN"
                                      ? "bg-blue-100/80 text-blue-800 backdrop-blur-sm"
                                      : complaint.status === "IN_REVIEW"
                                        ? "bg-yellow-100/80 text-yellow-800 backdrop-blur-sm"
                                        : complaint.status === "RESOLVED"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                  }
                                >
                                  {complaint.status.replace("_", " ")}
                                </Badge>
                                <Badge
                                  className={
                                    complaint.severity === "LOW"
                                      ? "bg-green-100/80 text-green-800 backdrop-blur-sm"
                                      : complaint.severity === "MEDIUM"
                                        ? "bg-yellow-100/80 text-yellow-800 backdrop-blur-sm"
                                        : complaint.severity === "HIGH"
                                          ? "bg-orange-100/80 text-orange-800 backdrop-blur-sm"
                                          : "bg-red-100/80 text-red-800 backdrop-blur-sm"
                                  }
                                >
                                  {complaint.severity}
                                </Badge>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 mb-4 text-sm line-clamp-3 flex-1">{complaint.description}</p>

                            {/* Property Info */}
                            {property && (
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className="w-4 h-4 text-teal-600" />
                                  <span className="font-semibold text-sm text-gray-900">{property.title}</span>
                                </div>
                                {property.address && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <MapPin className="w-3 h-3 text-teal-600" />
                                    <span>{property.address.city}, {property.address.country}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Host Phone Number */}
                            {phoneNumber && (
                              <div className="mb-4 flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-teal-600" />
                                <span className="text-gray-600">Host Phone:</span>
                                <span className="font-semibold text-gray-900">{phoneNumber}</span>
                              </div>
                            )}

                            {/* Type */}
                            <div className="mb-4">
                              <span className="text-xs text-gray-500">Type: </span>
                              <span className="text-xs font-medium text-gray-700">{complaint.type.replace("_", " ")}</span>
                            </div>

                            {/* Refund and Penalty */}
                            <div className="mb-4 space-y-1">
                              {complaint.refundAmount && (
                                <div className="text-sm font-semibold text-green-600">
                                  Refund: ${complaint.refundAmount.toFixed(2)}
                                </div>
                              )}
                              {complaint.penaltyPoints && (
                                <div className="text-sm font-semibold text-red-600">
                                  Penalty: {complaint.penaltyPoints} pts
                                </div>
                              )}
                            </div>

                            {/* Resolution Notes */}
                            {complaint.resolutionNotes && (
                              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs font-semibold text-blue-900 mb-1">Resolution:</p>
                                <p className="text-xs text-blue-700">{complaint.resolutionNotes}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-200">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => router.push(`/reclamation/${complaint.bookingId}?isHost=${complaint.complainantRole === "HOST"}&reclamationId=${complaint.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {complaint.status === "OPEN" && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveReclamation(complaint.bookingId, complaint.id)}
                                  disabled={actionLoading[complaint.bookingId]}
                                >
                                  {actionLoading[complaint.bookingId] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Edit Booking Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Edit Booking #{editingBooking?.id}
              </DialogTitle>
            </DialogHeader>

            {editingBooking && (
              <div className="space-y-6 mt-4">
                {/* Property Info */}
                {editingBooking.property && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">{editingBooking.property.title}</h3>
                    {editingBooking.property.address && (
                      <p className="text-sm text-gray-600">
                        {editingBooking.property.address.city}, {editingBooking.property.address.country}
                      </p>
                    )}
                  </div>
                )}

                {/* Check-in Date */}
                <div>
                  <Label htmlFor="checkInDate" className="text-sm font-semibold text-gray-700">
                    Check-in Date *
                  </Label>
                  <Input
                    id="checkInDate"
                    type="date"
                    value={editFormData.checkInDate}
                    onChange={(e) => setEditFormData({ ...editFormData, checkInDate: e.target.value })}
                    min={(() => {
                      const today = new Date()
                      const year = today.getFullYear()
                      const month = String(today.getMonth() + 1).padStart(2, '0')
                      const day = String(today.getDate()).padStart(2, '0')
                      return `${year}-${month}-${day}`
                    })()}
                    className="mt-2"
                  />
                </div>

                {/* Check-out Date */}
                <div>
                  <Label htmlFor="checkOutDate" className="text-sm font-semibold text-gray-700">
                    Check-out Date *
                  </Label>
                  <Input
                    id="checkOutDate"
                    type="date"
                    value={editFormData.checkOutDate}
                    onChange={(e) => setEditFormData({ ...editFormData, checkOutDate: e.target.value })}
                    min={editFormData.checkInDate || (() => {
                      const today = new Date()
                      const year = today.getFullYear()
                      const month = String(today.getMonth() + 1).padStart(2, '0')
                      const day = String(today.getDate()).padStart(2, '0')
                      return `${year}-${month}-${day}`
                    })()}
                    className="mt-2"
                  />
                </div>

                {/* Number of Guests */}
                <div>
                  <Label htmlFor="numberOfGuests" className="text-sm font-semibold text-gray-700">
                    Number of Guests
                  </Label>
                  <Input
                    id="numberOfGuests"
                    type="number"
                    min="1"
                    value={editFormData.numberOfGuests}
                    onChange={(e) => setEditFormData({ ...editFormData, numberOfGuests: parseInt(e.target.value) || 1 })}
                    className="mt-2"
                  />
                </div>

                {/* Requested Price (if negotiation is enabled OR booking is rejected) */}
                {((editingBooking.property?.negotiationPercentage && editingBooking.property.negotiationPercentage > 0) ||
                  editingBooking.status === "NEGOTIATION_REJECTED" ||
                  editingBooking.status === "PENDING_NEGOTIATION") && (
                    <div>
                      <Label htmlFor="requestedPrice" className="text-sm font-semibold text-gray-700">
                        Requested Price (MAD) *
                      </Label>
                      <Input
                        id="requestedPrice"
                        type="number"
                        step="0.001"
                        min="0"
                        value={editFormData.requestedPrice || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, requestedPrice: e.target.value || undefined })}
                        placeholder="Enter your requested price"
                        className="mt-2"
                        required
                      />
                      {editingBooking.property?.negotiationPercentage && editingBooking.property.negotiationPercentage > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum negotiation: {editingBooking.property.negotiationPercentage}%
                        </p>
                      )}
                      {editingBooking.status === "NEGOTIATION_REJECTED" && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">
                          ⚠️ Your previous negotiation was rejected. Please enter a new price.
                        </p>
                      )}
                    </div>
                  )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditModalOpen(false)
                      setEditingBooking(null)
                      setError("")
                    }}
                    className="flex-1 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={actionLoading[editingBooking.id]}
                    className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {actionLoading[editingBooking.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Booking Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Booking Details
              </DialogTitle>
            </DialogHeader>

            {viewingBooking && (
              <div className="space-y-6 mt-4">
                {/* Property Image and Title */}
                {viewingBooking.property && (
                  <div className="relative h-48 bg-gradient-to-br from-teal-100 to-cyan-200 rounded-lg overflow-hidden mb-4">
                    {getPropertyImage(viewingBooking.property) ? (
                      <Image
                        src={getImageUrl(getPropertyImage(viewingBooking.property))}
                        alt={viewingBooking.property.title || "Property"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 80vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-16 h-16 text-teal-300" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      {getStatusBadge(viewingBooking.status)}
                    </div>
                  </div>
                )}

                {/* Property Info */}
                {viewingBooking.property && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {viewingBooking.property.title}
                    </h3>
                    {viewingBooking.property.address && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-teal-600" />
                        <span>{viewingBooking.property.address.city}, {viewingBooking.property.address.country}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Dates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-teal-600" />
                    Booking Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Check-in</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDate(viewingBooking.checkInDate)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Check-out</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDate(viewingBooking.checkOutDate)}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-700">
                        <Clock className="w-4 h-4 mr-2 text-teal-600" />
                        <span className="font-medium">Duration</span>
                      </div>
                      <span className="text-lg font-bold text-teal-700">
                        {calculateNights(viewingBooking.checkInDate, viewingBooking.checkOutDate)} {calculateNights(viewingBooking.checkInDate, viewingBooking.checkOutDate) === 1 ? "night" : "nights"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-teal-600" />
                    Pricing
                  </h3>
                  <div className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border-2 border-teal-200">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Total Price</span>
                      <span className="text-xl font-bold text-teal-700">
                        {viewingBooking.totalPrice?.toFixed(0) || "N/A"} MAD
                      </span>
                    </div>
                    {viewingBooking.longStayDiscountPercent && viewingBooking.longStayDiscountPercent > 0 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-teal-200">
                        <span className="text-sm text-gray-600">Long Stay Discount</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {viewingBooking.longStayDiscountPercent}%
                        </span>
                      </div>
                    )}
                    {viewingBooking.requestedNegotiationPercent && viewingBooking.requestedNegotiationPercent > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">Negotiation</span>
                        <span className="text-sm font-semibold text-yellow-600">
                          {viewingBooking.requestedNegotiationPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Information */}
                {viewingBooking.status === "PENDING_NEGOTIATION" && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 text-center">
                      ⏳ Waiting for host to approve your negotiation
                    </p>
                  </div>
                )}

                {viewingBooking.status === "NEGOTIATION_REJECTED" && (
                  <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-800 text-center mb-2">
                      ⚠️ Your negotiation was rejected by the host
                    </p>
                    <p className="text-xs text-orange-700 text-center">
                      You can edit the booking to change the price or cancel it
                    </p>
                  </div>
                )}

                {viewingBooking.status === "TENANT_CHECKED_OUT" && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 text-center">
                      ⏳ Waiting for host to confirm your checkout
                    </p>
                  </div>
                )}

                {viewingBooking.status === "COMPLETED" && (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800 text-center">
                      ✓ Booking completed successfully
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  {/* Payment Button */}
                  {viewingBooking.status === "PENDING_PAYMENT" && (
                    <Button
                      onClick={() => {
                        setViewModalOpen(false)
                        handlePay(viewingBooking.id)
                      }}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </Button>
                  )}

                  {/* Negotiation Rejected - Show option to edit */}
                  {viewingBooking.status === "NEGOTIATION_REJECTED" && (
                    <Button
                      onClick={() => {
                        setViewModalOpen(false)
                        handleEdit(viewingBooking)
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Change Price
                    </Button>
                  )}

                  {/* Checkout Button */}
                  {viewingBooking.status === "CONFIRMED" && (
                    <Button
                      onClick={async () => {
                        setViewModalOpen(false)
                        await handleCheckout(viewingBooking.id)
                      }}
                      disabled={actionLoading[viewingBooking.id]}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading[viewingBooking.id] ? (
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

                  {/* Reclamation Button */}
                  {viewingBooking.status === "CONFIRMED" && (
                    <>
                      {reclamations[viewingBooking.id] ? (
                        <Button
                          onClick={async () => {
                            setViewModalOpen(false)
                            await handleRemoveReclamation(viewingBooking.id, reclamations[viewingBooking.id].id)
                          }}
                          disabled={actionLoading[viewingBooking.id]}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
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
                          className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Reclamation
                        </Button>
                      )}
                    </>
                  )}

                  {/* Edit Button */}
                  {(viewingBooking.status === "PENDING_PAYMENT" ||
                    viewingBooking.status === "PENDING_NEGOTIATION" ||
                    viewingBooking.status === "NEGOTIATION_REJECTED") && (
                      <Button
                        onClick={() => {
                          setViewModalOpen(false)
                          handleEdit(viewingBooking)
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}

                  {/* Delete Button */}
                  {(viewingBooking.status === "PENDING_PAYMENT" ||
                    viewingBooking.status === "PENDING_NEGOTIATION" ||
                    viewingBooking.status === "NEGOTIATION_REJECTED") && (
                      <Button
                        onClick={async () => {
                          setViewModalOpen(false)
                          await handleDelete(viewingBooking.id)
                        }}
                        disabled={actionLoading[viewingBooking.id]}
                        variant="destructive"
                        className="flex-1"
                      >
                        {actionLoading[viewingBooking.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancel
                          </>
                        )}
                      </Button>
                    )}

                  {/* Close Button */}
                  <Button
                    onClick={() => setViewModalOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
