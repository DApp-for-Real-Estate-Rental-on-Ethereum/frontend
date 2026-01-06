"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/services/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Upload, MapPin, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export default function PostPropertyPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, token } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    typeId: "1",
    dailyPrice: "", // Daily price in MAD
    depositAmount: "", // Deposit amount in MAD
    negotiationPercentage: "", // negotiation percentage
    capacity: "",
    numberOfBedrooms: "",
    numberOfBathrooms: "",
    numberOfBeds: "",
    address: "",
    city: "",
    country: "Morocco",
    zipCode: "",
    latitude: "",
    longitude: "",
  })
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreview, setImagePreview] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [discountPlans, setDiscountPlans] = useState({
    fiveDays: false, // 10% discount for 5+ days
    fifteenDays: false, // 15% discount for 15+ days
    oneMonth: false, // 20% discount for 30+ days
  })

  // Fetch wallet address from API if not in localStorage
  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!user || !token || authLoading) {
        setIsCheckingWallet(false)
        return
      }

      // First check if walletAddress is in user object
      if (user.walletAddress && user.walletAddress.trim() !== "") {
        setWalletAddress(user.walletAddress)
        setIsCheckingWallet(false)
        return
      }

      // If not, fetch from API
      try {
        const userData = await apiClient.users.getMe()
        const walletAddr = userData.walletAddress && userData.walletAddress.trim() !== "" ? userData.walletAddress : null
        setWalletAddress(walletAddr)

        // Update user in localStorage if walletAddress was found
        if (walletAddr) {
          const updatedUser = { ...user, walletAddress: walletAddr }
          localStorage.setItem("user", JSON.stringify(updatedUser))
          localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data", JSON.stringify(updatedUser))
          window.dispatchEvent(new Event("auth-state-changed"))
        }
      } catch (error) {
        console.error("Failed to fetch wallet address:", error)
        setWalletAddress(null)
      } finally {
        setIsCheckingWallet(false)
      }
    }

    fetchWalletAddress()
  }, [user, token, authLoading])

  if (authLoading || isCheckingWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600 mb-4">Please sign in to post a property.</p>
        <Link href="/login">
          <Button className="bg-teal-600 hover:bg-teal-700">Sign In</Button>
        </Link>
      </div>
    )
  }

  // Check if user has wallet address - show message immediately if not connected
  // Use walletAddress from state (fetched from API) or from user object
  const hasWallet = walletAddress || (user?.walletAddress && user.walletAddress.trim() !== "")
  if (!hasWallet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-md">
          <p className="text-gray-600 mb-4">
            You must connect your wallet before creating a property.
            <br />
            Please go to your profile and connect your wallet.
          </p>
          <Link href="/profile">
            <Button className="bg-teal-600 hover:bg-teal-700">Go to Profile</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Combine with existing images (if any)
    const totalFiles = [...images, ...files]

    // Validate total image count: must be between 5 and 10
    if (totalFiles.length > 10) {
      setError(`You can upload at most 10 images total. Currently have ${images.length}, trying to add ${files.length}`)
      e.target.value = "" // Reset input
      return
    }

    setImages(totalFiles)
    setError("") // Clear any previous errors

    // Create previews for new files and combine with existing
    const newPreviews = files.map((file) => {
      return URL.createObjectURL(file)
    })
    setImagePreview([...imagePreview, ...newPreviews])

    // Reset input to allow selecting more files
    e.target.value = ""
  }

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leak
    URL.revokeObjectURL(imagePreview[index])

    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreview.filter((_, i) => i !== index)

    setImages(newImages)
    setImagePreview(newPreviews)
    setError("") // Clear any errors when removing images
  }

  const getCurrentLocation = (retryCount = 0) => {
    // Geolocation requires HTTPS or localhost; warn early on insecure origins like 192.168.*
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Location access needs HTTPS (or localhost). Please enable location on a secure connection or enter your address manually.")
      return
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter address manually.")
      return
    }

    setIsGettingLocation(true)
    setError("")

    // Try with high accuracy first, then fallback to lower accuracy
    const options = retryCount === 0
      ? {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 60000 // Accept cached position up to 1 minute old
      }
      : {
        enableHighAccuracy: false, // Fallback: use less accurate but faster method
        timeout: 10000,
        maximumAge: 300000 // Accept cached position up to 5 minutes old
      }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords

        console.log(`📍 Location obtained: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

        try {
          // Use OpenStreetMap Nominatim API for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Derent Property App' // Required by Nominatim
              }
            }
          )

          if (!response.ok) {
            throw new Error("Failed to get address from coordinates")
          }

          const data = await response.json()
          const addressData = data.address || {}

          console.log("📍 Reverse geocoding result:", addressData)

          // Update form data with location information
          setFormData((prev) => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            address: addressData.road || addressData.house_number
              ? `${addressData.house_number || ""} ${addressData.road || ""}`.trim()
              : prev.address,
            city: addressData.city || addressData.town || addressData.village || addressData.municipality || addressData.county || prev.city,
            country: addressData.country || prev.country,
            zipCode: addressData.postcode || prev.zipCode,
          }))

          setError("")
        } catch (err) {
          console.error("Reverse geocoding error:", err)
          // Even if reverse geocoding fails, save the coordinates
          setFormData((prev) => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          }))
          setError("Location detected but could not get address details. Please fill address manually.")
        } finally {
          setIsGettingLocation(false)
        }
      },
      (error) => {
        console.error("Geolocation error:", {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
        })
        setIsGettingLocation(false)

        // Retry with lower accuracy if first attempt failed
        if (retryCount === 0 && (error.code === error.POSITION_UNAVAILABLE || error.code === 2)) {
          console.log("Retrying with lower accuracy...")
          setTimeout(() => getCurrentLocation(1), 500)
          return
        }

        // Handle error codes (using constants or numeric values)
        const errorCode = error.code
        const errorMessage = error.message || ""

        if (errorCode === error.PERMISSION_DENIED || errorCode === 1) {
          setError("Location access denied. Please enable location permissions in your browser settings and try again.")
        } else if (errorCode === error.POSITION_UNAVAILABLE || errorCode === 2) {
          // Check if it's a desktop/laptop without GPS
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
          const errorMsg = isMobile
            ? "Location unavailable. Please check if GPS is enabled on your device and try again, or enter address manually."
            : "Location unavailable. Desktop computers usually don't have GPS. Please enter address manually or use a mobile device."
          setError(errorMsg)
        } else if (errorCode === error.TIMEOUT || errorCode === 3) {
          setError("Location request timed out. This may happen if GPS signal is weak. Please try again or enter address manually.")
        } else {
          setError(`Unable to get location (Error code: ${errorCode}${errorMessage ? ` - ${errorMessage}` : ""}). Please enter address manually.`)
        }
      },
      options
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Check if user has wallet address (use state or user object)
      const currentWalletAddress = walletAddress || user?.walletAddress
      if (!currentWalletAddress || currentWalletAddress.trim() === "") {
        setError("You must connect your wallet before creating a property. Please go to your profile and connect your wallet.")
        setIsLoading(false)
        return
      }

      // Validate image count: must be between 5 and 10 images
      if (images.length === 0) {
        setError("Please upload at least 5 images for your property.")
        setIsLoading(false)
        return
      }
      if (images.length < 5) {
        setError(`Please upload at least 5 images. Currently uploaded: ${images.length}`)
        setIsLoading(false)
        return
      }
      if (images.length > 10) {
        setError(`You can upload at most 10 images. Currently uploaded: ${images.length}`)
        setIsLoading(false)
        return
      }

      // Validate numeric fields
      const dailyPrice = parseFloat(formData.dailyPrice)
      const depositAmount = parseFloat(formData.depositAmount) || 0
      const negotiationPercentage = parseFloat(formData.negotiationPercentage)
      const capacity = Number.parseInt(formData.capacity)
      const numberOfBedrooms = Number.parseInt(formData.numberOfBedrooms)
      const numberOfBathrooms = Number.parseInt(formData.numberOfBathrooms)
      const numberOfBeds = Number.parseInt(formData.numberOfBeds)

      if (isNaN(dailyPrice) || dailyPrice <= 0) {
        setError("Daily price must be a valid positive number.")
        setIsLoading(false)
        return
      }

      if (isNaN(depositAmount) || depositAmount < 0) {
        setError("Deposit amount must be a valid non-negative number.")
        setIsLoading(false)
        return
      }

      if (isNaN(negotiationPercentage) || negotiationPercentage < 0 || negotiationPercentage > 100) {
        setError("negotiation percentage must be between 0 and 100.")
        setIsLoading(false)
        return
      }

      if (isNaN(capacity) || capacity < 1) {
        setError("Capacity must be at least 1.")
        setIsLoading(false)
        return
      }

      if (isNaN(numberOfBedrooms) || numberOfBedrooms < 1) {
        setError("Number of bedrooms must be at least 1.")
        setIsLoading(false)
        return
      }

      if (isNaN(numberOfBathrooms) || numberOfBathrooms < 1) {
        setError("Number of bathrooms must be at least 1.")
        setIsLoading(false)
        return
      }

      if (isNaN(numberOfBeds) || numberOfBeds < 1) {
        setError("Number of beds must be at least 1.")
        setIsLoading(false)
        return
      }

      // Use first image as cover image (optional - if null, first image will be cover)
      const coverImageName = images[0]?.name || undefined

      const createRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        typeId: Number.parseInt(formData.typeId),
        dailyPrice: dailyPrice,
        depositAmount: depositAmount,
        negotiationPercentage: negotiationPercentage,
        capacity: capacity,
        numberOfBedrooms: numberOfBedrooms,
        numberOfBathrooms: numberOfBathrooms,
        numberOfBeds: numberOfBeds,
        address: {
          address: formData.address.trim(),
          city: formData.city.trim(),
          country: formData.country.trim(),
          zipCode: formData.zipCode ? Number.parseInt(formData.zipCode) : undefined,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        },
        amenities: [],
        coverImageName: coverImageName,
        // Discount plan (only include enabled plans, or null if none)
        discountPlan: (discountPlans.fiveDays || discountPlans.fifteenDays || discountPlans.oneMonth) ? {
          ...(discountPlans.fiveDays && { fiveDays: 10 }), // 10% discount for 5+ days
          ...(discountPlans.fifteenDays && { fifteenDays: 15 }), // 15% discount for 15+ days
          ...(discountPlans.oneMonth && { oneMonth: 20 }), // 20% discount for 30+ days
        } : null,
      }

      const result = await apiClient.properties.create(createRequest, images)

      // Refresh user data to get updated roles (HOST role was added)
      try {
        const userData = await apiClient.users.getMe()

        // Persist backend roles as-is so HOST remains available in headers
        const backendRoles = userData.roles && userData.roles.length > 0 ? userData.roles : user?.roles || ["USER"]

        const updatedUser = {
          ...user,
          roles: backendRoles,
          walletAddress: userData.walletAddress || user?.walletAddress,
        }

        localStorage.setItem("user", JSON.stringify(updatedUser))
        localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data", JSON.stringify(updatedUser))

        // Dispatch event to update all components (including header)
        window.dispatchEvent(new Event("auth-state-changed"))
      } catch (error) {
        console.error("Failed to refresh user data:", error)
        // Continue anyway - user can refresh manually
      }

      router.refresh() // Refresh to update header
      router.push(`/property/${result.propertyId || result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create property")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">List Your Property</h1>
        <p className="text-gray-600 mb-8">Fill in the details to post your property</p>
        <Card className="p-8 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

            {/* Images Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Images</h2>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-600 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-teal-600 hover:text-teal-700 font-medium">Click to upload</span> or drag and
                    drop
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB (5-10 images required)
                    {images.length > 0 && images.length < 10 && " - You can add more images"}
                  </p>
                </div>

                {imagePreview.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {imagePreview.map((preview, i) => (
                        <div key={i} className="relative group">
                          <div className="relative h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                            <img
                              src={preview || "/placeholder.svg"}
                              alt={`Preview ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-center mt-1 text-gray-600">Image {i + 1}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${images.length < 5 ? "text-red-600" : images.length <= 10 ? "text-green-600" : "text-gray-600"}`}>
                        {images.length} / 10 images
                      </span>
                      {images.length < 5 && (
                        <span className="text-red-600 text-xs">
                          (Need {5 - images.length} more to proceed)
                        </span>
                      )}
                      {images.length >= 5 && images.length <= 10 && (
                        <span className="text-green-600 text-xs">✓ Ready to submit</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="e.g. Modern Downtown Apartment"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent h-32 transition-all resize-none"
                    placeholder="Describe your property in detail..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                    <select
                      name="typeId"
                      value={formData.typeId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    >
                      <option value="1">Apartment</option>
                      <option value="2">House</option>
                      <option value="3">Studio</option>
                      <option value="4">Condo</option>
                      <option value="5">Villa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Price (MAD) *</label>
                    <input
                      type="number"
                      name="dailyPrice"
                      value={formData.dailyPrice}
                      onChange={handleInputChange}
                      step="1"
                      min="0"
                      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      placeholder="600"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Price per day in Moroccan Dirham (MAD)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Amount (MAD) *</label>
                    <input
                      type="number"
                      name="depositAmount"
                      value={formData.depositAmount}
                      onChange={handleInputChange}
                      step="1"
                      min="0"
                      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      placeholder="1000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Security deposit amount in Moroccan Dirham (MAD)</p>
                  </div>
                </div>

                {/* negotiation Percentage Field - MUST BE VISIBLE */}
                <div className="w-full mt-4">
                  <label htmlFor="negotiationPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                    negotiation Percentage (%) *
                  </label>
                  <input
                    id="negotiationPercentage"
                    type="number"
                    name="negotiationPercentage"
                    value={formData.negotiationPercentage}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="0.0"
                    required
                    style={{ display: 'block', visibility: 'visible' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the negotiation percentage (0-100%)</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guests *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms *</label>
                  <input
                    type="number"
                    name="numberOfBedrooms"
                    value={formData.numberOfBedrooms}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beds *</label>
                  <input
                    type="number"
                    name="numberOfBeds"
                    value={formData.numberOfBeds}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms *</label>
                  <input
                    type="number"
                    name="numberOfBathrooms"
                    value={formData.numberOfBathrooms}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Discount Plan */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Discount Plan</h2>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">5 Days</span>
                      <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded">10% OFF</span>
                    </div>
                    <p className="text-sm text-gray-600">Get 10% discount when booking for 5 days or more</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={discountPlans.fiveDays}
                      onCheckedChange={(checked) =>
                        setDiscountPlans((prev) => ({ ...prev, fiveDays: checked }))
                      }
                    />
                    <span className="text-sm text-gray-700 min-w-[60px]">
                      {discountPlans.fiveDays ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">15 Days</span>
                      <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded">15% OFF</span>
                    </div>
                    <p className="text-sm text-gray-600">Get 15% discount when booking for 15 days or more</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={discountPlans.fifteenDays}
                      onCheckedChange={(checked) =>
                        setDiscountPlans((prev) => ({ ...prev, fifteenDays: checked }))
                      }
                    />
                    <span className="text-sm text-gray-700 min-w-[60px]">
                      {discountPlans.fifteenDays ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">1 Month+</span>
                      <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded">20% OFF</span>
                    </div>
                    <p className="text-sm text-gray-600">Get 20% discount when booking for a month or more</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={discountPlans.oneMonth}
                      onCheckedChange={(checked) =>
                        setDiscountPlans((prev) => ({ ...prev, oneMonth: checked }))
                      }
                    />
                    <span className="text-sm text-gray-700 min-w-[60px]">
                      {discountPlans.oneMonth ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-teal-200">
                  Enable the discount plans you want to offer. Discounts are automatically applied based on the booking duration.
                </p>
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Location</h2>
                <Button
                  type="button"
                  onClick={() => getCurrentLocation()}
                  disabled={isGettingLocation}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Use Current Location
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-4">
                {(formData.latitude || formData.longitude) && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-700">
                    <p className="font-medium">📍 Location detected:</p>
                    <p className="text-xs mt-1">
                      {formData.latitude && formData.longitude
                        ? `Lat: ${parseFloat(formData.latitude).toFixed(6)}, Lng: ${parseFloat(formData.longitude).toFixed(6)}`
                        : ""}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      placeholder="Casablanca"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      placeholder="20000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Link href="/" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 h-12 text-lg shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
                {isLoading ? "Publishing..." : "Publish Property"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
