"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/services/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertTriangle, X, Upload, CheckCircle, Phone, MapPin, Building2, Calendar, Clock, Badge } from "lucide-react"
import Image from "next/image"
import { Badge as BadgeComponent } from "@/components/ui/badge"
import type { Property } from "@/lib/types"

const GUEST_RECLAMATION_TYPES = [
  { value: "ACCESS_ISSUE", label: "Access Issue", description: "Cannot access the property, key/code doesn't work, host didn't respond..." },
  { value: "NOT_AS_DESCRIBED", label: "Property Not As Described", description: "Different number of rooms, location, property type, missing important amenities..." },
  { value: "CLEANLINESS", label: "Cleanliness Issue", description: "Dirty, strong odors, unclean bedding..." },
  { value: "SAFETY_HEALTH", label: "Safety or Health Hazard", description: "Gas leak, exposed wires, excessive pests..." },
  // HOST_CANCELLATION removed - will have special handling
]

const HOST_RECLAMATION_TYPES = [
  { value: "PROPERTY_DAMAGE", label: "Property Damage", description: "Broken furniture, appliances, glass, walls..." },
  { value: "EXTRA_CLEANING", label: "Excessive Dirt", description: "Requires deep cleaning (unusual condition after departure)" },
  { value: "HOUSE_RULE_VIOLATION", label: "House Rule Violation", description: "Parties, smoking prohibited, unauthorized pets..." },
  { value: "UNAUTHORIZED_GUESTS_OR_STAY", label: "Unauthorized Guests or Extended Stay", description: "Not authorized or staying longer than agreed without payment" },
  // LOST_KEYS_OR_EXTRA_FEES removed
]

interface ImagePreview {
  file: File
  preview: string
}

export default function ReclamationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const bookingId = params?.bookingId as string
  const isHost = searchParams?.get("isHost") === "true"
  const reclamationIdParam = searchParams?.get("reclamationId")

  const [selectedType, setSelectedType] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<ImagePreview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // View mode state
  const [viewMode, setViewMode] = useState(false)
  const [existingReclamation, setExistingReclamation] = useState<any | null>(null)
  const [booking, setBooking] = useState<any | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [otherPartyPhone, setOtherPartyPhone] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const reclamationTypes = isHost ? HOST_RECLAMATION_TYPES : GUEST_RECLAMATION_TYPES

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return
    }

    // Only redirect if auth is finished loading and user is not authenticated
    if (!isAuthenticated || !user || !bookingId) {
      router.push("/login")
      return
    }
    
    // Check if reclamation exists (view mode)
    fetchExistingReclamation()
  }, [user, bookingId, router, authLoading, isAuthenticated, reclamationIdParam])

  const fetchExistingReclamation = async () => {
    if (!user?.id || !bookingId) return
    
    setLoadingDetails(true)
    try {
      let reclamation: any | null = null
      
      // If reclamationId is provided in query params, use it directly
      if (reclamationIdParam) {
        try {
          console.log("🔍 Fetching reclamation by ID:", reclamationIdParam)
          reclamation = await apiClient.reclamations.getById(parseInt(reclamationIdParam))
          console.log("✅ Found reclamation by ID:", reclamation)
        } catch (err) {
          console.error("❌ Failed to fetch reclamation by ID:", err)
          // Fall back to bookingId and complainantId method
        }
      }
      
      // If not found by ID, try by bookingId and complainantId
      if (!reclamation) {
        try {
          console.log("🔍 Fetching reclamation by bookingId and complainantId:", bookingId, user.id)
          reclamation = await apiClient.reclamations.getByBookingIdAndComplainant(
            bookingId,
            user.id
          )
          console.log("✅ Found reclamation by bookingId:", reclamation)
        } catch (err) {
          console.error("❌ Failed to fetch reclamation by bookingId:", err)
        }
      }
      
      if (reclamation) {
        setExistingReclamation(reclamation)
        setViewMode(true)
        
        // Fetch booking and property details
        try {
          const bookingData = await apiClient.bookings.getById(bookingId)
          setBooking(bookingData)
          
          let propertyData: Property | null = null
          if (bookingData?.propertyId) {
            try {
              propertyData = await apiClient.properties.getById(String(bookingData.propertyId))
              setProperty(propertyData)
            } catch (err) {
              console.error("Failed to fetch property:", err)
            }
          }
          
          // Fetch other party phone number
          try {
            let targetUserId: number | null = null
            
            console.log("📞 Reclamation data:", {
              complainantId: reclamation.complainantId,
              targetUserId: reclamation.targetUserId,
              complainantRole: reclamation.complainantRole,
              currentUserId: user.id
            })
            
            // Determine who to show phone number for
            // If user is the complainant, show target user's phone
            // If user is the target, show complainant's phone
            if (reclamation.complainantId === user.id) {
              // User is the complainant, show target user's phone
              targetUserId = reclamation.targetUserId
              console.log("📞 User is complainant, fetching target user phone. targetUserId:", targetUserId)
            } else {
              // User is the target, show complainant's phone
              targetUserId = reclamation.complainantId
              console.log("📞 User is target, fetching complainant phone. complainantId:", targetUserId)
            }
            
            // Fallback: if targetUserId is not available, try to get it from booking/property
            if ((!targetUserId || targetUserId === 0) && bookingData) {
              console.log("⚠️ targetUserId not available, trying fallback method")
              if (reclamation.complainantRole === "GUEST") {
                // User is guest complainant, get host from property
                if (propertyData?.userId) {
                  targetUserId = parseInt(String(propertyData.userId))
                } else {
                  const propertyInfo = await apiClient.bookings.getPropertyInfo(String(bookingData.propertyId))
                  if (propertyInfo.ownerId) {
                    targetUserId = propertyInfo.ownerId
                  }
                }
              } else {
                // User is host complainant, get tenant from booking
                targetUserId = bookingData.userId
              }
              console.log("📞 Fallback targetUserId:", targetUserId)
            }
            
            if (targetUserId && targetUserId > 0) {
              console.log("📞 Fetching user info for ID:", targetUserId)
              const userInfo = await apiClient.users.getById(targetUserId)
              console.log("📞 User info received:", userInfo)
              if (userInfo && userInfo.phoneNumber) {
                console.log("✅ Setting phone number:", userInfo.phoneNumber)
                setOtherPartyPhone(String(userInfo.phoneNumber))
              } else {
                console.log("⚠️ No phone number found in user info")
              }
            } else {
              console.log("⚠️ Invalid targetUserId:", targetUserId)
            }
          } catch (err) {
            console.error("❌ Failed to fetch phone number:", err)
          }
        } catch (err) {
          console.error("Failed to fetch booking:", err)
        }
      }
    } catch (err) {
      // Reclamation doesn't exist, stay in create mode
      console.log("No existing reclamation found, staying in create mode")
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 3) {
      setError("You can upload a maximum of 3 images")
      return
    }

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setImages([...images, ...newImages])
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    // Revoke object URLs to prevent memory leaks
    URL.revokeObjectURL(images[index].preview)
    setImages(newImages)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedType) {
      setError("Please select a reclamation type")
      return
    }

    if (!title || !title.trim()) {
      setError("Title is required")
      return
    }

    if (!description || !description.trim()) {
      setError("Description is required")
      return
    }

    if (images.length > 3) {
      setError("You can upload a maximum of 3 images")
      return
    }

    if (!user?.id || !bookingId) {
      setError("User or booking information is missing")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const complainantRole = isHost ? "HOST" : "GUEST"
      const imageFiles = images.map((img) => img.file)

      await apiClient.reclamations.create(
        bookingId,
        user.id,
        complainantRole as "GUEST" | "HOST",
        selectedType,
        title.trim(),
        description.trim(),
        imageFiles.length > 0 ? imageFiles : undefined
      )

      // Images are now sent with the reclamation creation request
      // They will be saved automatically by reclamation-service

      setSuccess(true)
      setTimeout(() => {
        router.back()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to submit reclamation")
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-teal-600 mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-teal-100 rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, will redirect (don't render anything)
  if (!isAuthenticated || !user || !bookingId) {
    return null
  }

  // View Mode - Show reclamation details
  if (viewMode && existingReclamation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 shadow-2xl border-2 border-teal-100 bg-white/95 backdrop-blur-sm">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isHost ? 'bg-orange-100' : 'bg-teal-100'}`}>
                    <AlertTriangle className={`w-6 h-6 ${isHost ? 'text-orange-600' : 'text-teal-600'}`} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                      Reclamation Details
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      View your reclamation information
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Back
                </Button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                <p className="ml-4 text-gray-600">Loading details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Title and Status */}
                <div className="p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{existingReclamation.title}</h2>
                    <div className="flex items-center gap-2">
                      <BadgeComponent
                        className={
                          existingReclamation.status === "OPEN"
                            ? "bg-blue-100 text-blue-800"
                            : existingReclamation.status === "IN_REVIEW"
                            ? "bg-yellow-100 text-yellow-800"
                            : existingReclamation.status === "RESOLVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {existingReclamation.status.replace("_", " ")}
                      </BadgeComponent>
                      <BadgeComponent
                        className={
                          existingReclamation.severity === "LOW"
                            ? "bg-green-100 text-green-800"
                            : existingReclamation.severity === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800"
                            : existingReclamation.severity === "HIGH"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {existingReclamation.severity}
                      </BadgeComponent>
                    </div>
                  </div>
                  <p className="text-gray-700 text-base leading-relaxed">{existingReclamation.description}</p>
                </div>

                {/* Property Info */}
                {property && (
                  <div className="p-6 bg-teal-50 rounded-lg border-2 border-teal-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-teal-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-900">{property.title}</p>
                      {property.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-teal-600" />
                          <span>{property.address.city}, {property.address.country}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Booking Dates */}
                {booking && (
                  <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Booking Dates</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Check-in</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(booking.checkInDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Check-out</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(booking.checkOutDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Party Phone Number */}
                {otherPartyPhone && (
                  <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {existingReclamation.complainantId === user.id 
                          ? (existingReclamation.complainantRole === "GUEST" ? "Host" : "Tenant")
                          : (existingReclamation.complainantRole === "GUEST" ? "Guest" : "Host")
                        } Phone Number
                      </h3>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{otherPartyPhone}</p>
                    <a 
                      href={`tel:${otherPartyPhone}`}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call Now
                    </a>
                  </div>
                )}

                {/* Type */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Reclamation Type</p>
                  <p className="font-semibold text-gray-900">
                    {existingReclamation.type.replace(/_/g, " ")}
                  </p>
                </div>

                {/* Refund and Penalty */}
                {(existingReclamation.refundAmount || existingReclamation.penaltyPoints) && (
                  <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial Details</h3>
                    <div className="space-y-2">
                      {existingReclamation.refundAmount && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Refund Amount:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${existingReclamation.refundAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {existingReclamation.penaltyPoints && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Penalty Points:</span>
                          <span className="text-lg font-bold text-red-600">
                            {existingReclamation.penaltyPoints} pts
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolution Notes */}
                {existingReclamation.resolutionNotes && (
                  <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Resolution Notes</h3>
                    <p className="text-blue-700">{existingReclamation.resolutionNotes}</p>
                  </div>
                )}

                {/* Images */}
                {existingReclamation.attachments && existingReclamation.attachments.length > 0 && (
                  <div className="p-6 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Attached Images</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {existingReclamation.attachments.map((attachment: any, index: number) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <Image
                            src={`http://localhost:8091${attachment.filePath}`}
                            alt={`Attachment ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 33vw, 200px"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons - Only show Delete if user is complainant */}
                {existingReclamation.status === "OPEN" && 
                 existingReclamation.complainantId === user.id && (
                  <div className="pt-6 border-t-2 border-gray-100">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to delete this reclamation?")) {
                          try {
                            await apiClient.reclamations.delete(existingReclamation.id, user.id)
                            router.back()
                          } catch (err: any) {
                            setError(err.message || "Failed to delete reclamation")
                          }
                        }
                      }}
                    >
                      Delete Reclamation
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // Create Mode - Show form
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-8 shadow-2xl border-2 border-teal-100 bg-white/95 backdrop-blur-sm">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${isHost ? 'bg-orange-100' : 'bg-teal-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${isHost ? 'text-orange-600' : 'text-teal-600'}`} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {isHost ? "Host Reclamation" : "Guest Reclamation"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isHost ? "Report issues with your property" : "Report issues with your booking"}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-green-700 font-medium">Reclamation submitted successfully!</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reclamation Type */}
            <div>
              <Label className="text-base font-semibold text-gray-900 mb-4 block">
                Reclamation Type *
              </Label>
              <div className="space-y-3">
                {reclamationTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`block p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedType === type.value
                        ? "border-teal-500 bg-gradient-to-r from-teal-50 to-cyan-50 shadow-lg transform scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-teal-300 hover:shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedType === type.value
                          ? "border-teal-500 bg-teal-500"
                          : "border-gray-300"
                      }`}>
                        {selectedType === type.value && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <input
                        type="radio"
                        name="reclamationType"
                        value={type.value}
                        checked={selectedType === type.value}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1 text-lg">{type.label}</div>
                        <div className="text-sm text-gray-600 leading-relaxed">{type.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-base font-semibold text-gray-900 mb-2 block">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short title for the reclamation..."
                required
                className="mt-2 border-2 border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-lg transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-semibold text-gray-900 mb-2 block">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Add additional details about the reclamation..."
                required
                className="mt-2 border-2 border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-lg transition-all resize-none"
              />
            </div>

            {/* Images */}
            <div>
              <Label htmlFor="images" className="text-base font-semibold text-gray-900 mb-2 block">
                Images (Optional - Maximum 3 images)
              </Label>
              <div className="mt-2">
                <label
                  htmlFor="images"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    images.length >= 3
                      ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-50"
                      : "border-teal-300 bg-teal-50/50 hover:bg-teal-50 hover:border-teal-400"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className={`w-8 h-8 mb-2 ${images.length >= 3 ? 'text-gray-400' : 'text-teal-600'}`} />
                    <p className={`text-sm font-medium ${images.length >= 3 ? 'text-gray-400' : 'text-teal-700'}`}>
                      {images.length >= 3 ? "Maximum images reached" : "Click to upload images"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 3 images</p>
                  </div>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={images.length >= 3}
                    className="hidden"
                  />
                </label>
              </div>
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 shadow-md hover:shadow-xl transition-all duration-300">
                        <Image
                          src={img.preview}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 768px) 33vw, 150px"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full p-1.5 hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length > 0 && (
                <div className="mt-3 flex items-center justify-center">
                  <div className="px-4 py-2 bg-teal-100 rounded-full">
                    <p className="text-sm font-semibold text-teal-700">
                      {images.length} / 3 images
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t-2 border-gray-100">
              <Button
                type="submit"
                disabled={loading || !selectedType || !title.trim() || !description.trim()}
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Submit Reclamation
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => router.back()}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-6 rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

