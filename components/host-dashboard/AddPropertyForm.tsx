"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/services/api"
import { resolveMediaUrl } from "@/lib/services/api/core"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, MapPin, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface AddPropertyFormProps {
  onSuccess?: () => void
  propertyId?: string
  propertyData?: any
  isEditMode?: boolean
}

export function AddPropertyForm({ onSuccess, propertyId, propertyData, isEditMode = false }: AddPropertyFormProps) {
  const router = useRouter()
  const { user, isLoading: authLoading, token } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    typeId: "1",
    dailyPrice: "",
    depositAmount: "",
    negotiationPercentage: "",
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
    fiveDays: false,
    fifteenDays: false,
    oneMonth: false,
  })

  // Refs to prevent formData from being reset unnecessarily
  const formDataInitializedRef = useRef(false)
  const propertyDataIdRef = useRef<string | null>(null)

  // Fetch wallet address from API if not in localStorage
  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!user || !token || authLoading) {
        setIsCheckingWallet(false)
        return
      }

      if (user.walletAddress && user.walletAddress.trim() !== "") {
        setWalletAddress(user.walletAddress)
        setIsCheckingWallet(false)
        return
      }

      try {
        const userData = await apiClient.users.getMe()
        const walletAddr = userData.walletAddress && userData.walletAddress.trim() !== "" ? userData.walletAddress : null
        setWalletAddress(walletAddr)

        if (walletAddr) {
          const updatedUser = { ...user, walletAddress: walletAddr }
          localStorage.setItem("user", JSON.stringify(updatedUser))
          localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data", JSON.stringify(updatedUser))
          window.dispatchEvent(new Event("auth-state-changed"))
        }
      } catch (error) {
        setWalletAddress(null)
      } finally {
        setIsCheckingWallet(false)
      }
    }

    fetchWalletAddress()
  }, [user, token, authLoading])

  // Load property data for edit mode - ONLY ONCE when propertyData is first loaded
  useEffect(() => {
    if (isEditMode && propertyData && propertyId) {
      // Only initialize formData if this is a new property (different ID) or first time
      const isNewProperty = propertyDataIdRef.current !== propertyId

      if (isNewProperty || !formDataInitializedRef.current) {
        const initialFormData = {
          title: propertyData.title || "",
          description: propertyData.description || "",
          typeId: propertyData.type?.id?.toString() || "1",
          dailyPrice: propertyData.dailyPrice?.toString() || propertyData.price?.toString() || "",
          depositAmount: propertyData.depositAmount?.toString() || "",
          negotiationPercentage: propertyData.negotiationPercentage?.toString() || "",
          capacity: propertyData.capacity?.toString() || "",
          numberOfBedrooms: propertyData.numberOfBedrooms?.toString() || "",
          numberOfBathrooms: propertyData.numberOfBathrooms?.toString() || "",
          numberOfBeds: propertyData.numberOfBeds?.toString() || "",
          address: propertyData.address?.address || propertyData.address?.street || "",
          city: propertyData.address?.city || "",
          country: propertyData.address?.country || "Morocco",
          zipCode: propertyData.address?.zipCode?.toString() || "",
          latitude: propertyData.address?.latitude?.toString() || "",
          longitude: propertyData.address?.longitude?.toString() || "",
        }
        setFormData(initialFormData)
        formDataInitializedRef.current = true
        propertyDataIdRef.current = propertyId
      }

      // Set discount plans
      if (propertyData.discountPlan) {
        setDiscountPlans({
          fiveDays: !!propertyData.discountPlan.fiveDays,
          fifteenDays: !!propertyData.discountPlan.fifteenDays,
          oneMonth: !!propertyData.discountPlan.oneMonth,
        })
      }

      // Set image previews from existing images
      if (propertyData.propertyImages && propertyData.propertyImages.length > 0) {
        const previews = propertyData.propertyImages.map((img: any) => {
          return resolveMediaUrl(img.url)
        })
        setImagePreview(previews)
      }
    }
  }, [isEditMode, propertyData, propertyId])

  // Reset initialization flag when propertyId changes
  useEffect(() => {
    if (propertyId && propertyDataIdRef.current !== propertyId) {
      formDataInitializedRef.current = false
      propertyDataIdRef.current = null
    }
  }, [propertyId])

  if (authLoading || isCheckingWallet) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-600 mb-4">Please sign in to post a property.</p>
      </Card>
    )
  }

  const hasWallet = walletAddress || (user?.walletAddress && user.walletAddress.trim() !== "")
  if (!hasWallet) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-600 mb-4">
          You must connect your wallet before creating a property.
          <br />
          Please go to your profile and connect your wallet.
        </p>
      </Card>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      return updated
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Combine with existing images (if any)
    const totalFiles = [...images, ...files]

    // Validate total image count: must be between 5 and 10 (only for new properties)
    if (!isEditMode && totalFiles.length > 10) {
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
        setIsGettingLocation(false)

        if (retryCount === 0 && (error.code === error.POSITION_UNAVAILABLE || error.code === 2)) {
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

    // Use formData state directly - it's always up-to-date via handleInputChange
    // This ensures all fields are captured correctly
    const formDataToUse = { ...formData }

    try {
      const currentWalletAddress = walletAddress || user?.walletAddress
      if (!currentWalletAddress || currentWalletAddress.trim() === "") {
        setError("You must connect your wallet before creating a property. Please go to your profile and connect your wallet.")
        setIsLoading(false)
        return
      }

      // Validate image count: must be between 5 and 10 images (only for new properties)
      if (!isEditMode) {
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
      }

      if (isEditMode && images.length === 0 && (!propertyData?.propertyImages || propertyData.propertyImages.length === 0)) {
        setError("Please upload at least one image for your property.")
        setIsLoading(false)
        return
      }

      const dailyPrice = parseFloat(formDataToUse.dailyPrice)
      const depositAmount = parseFloat(formDataToUse.depositAmount) || 0
      const negotiationPercentage = parseFloat(formDataToUse.negotiationPercentage)
      const capacity = Number.parseInt(formDataToUse.capacity)
      const numberOfBedrooms = Number.parseInt(formDataToUse.numberOfBedrooms)
      const numberOfBathrooms = Number.parseInt(formDataToUse.numberOfBathrooms)
      const numberOfBeds = Number.parseInt(formDataToUse.numberOfBeds)

      if (isNaN(dailyPrice) || dailyPrice <= 0) {
        setError("Daily price must be a valid positive number.")
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

      if (isEditMode && propertyId) {
        // Update mode - use update API
        // Note: Backend UpdatePropertyRequest currently only supports: description, dailyPrice, capacity, amenities
        // Backend requires amenities to be @NotNull, so we must send existing amenities
        const existingAmenities = propertyData?.amenities || []

        // Ensure amenities have the correct structure (with id)
        // Backend expects Set<Amenity> where each amenity has an id that exists in the database
        const amenitiesToSend = existingAmenities
          .filter((amenity: any) => {
            const hasId = amenity && amenity.id
            return hasId
          })
          .map((amenity: any) => ({
            id: amenity.id,
            name: amenity.name || amenity.amenityName || "",
          }))

        // Ensure capacity is always provided (required by @NotNull)
        if (!capacity || capacity < 1) {
          setError("Capacity must be at least 1.")
          setIsLoading(false)
          return
        }

        // Parse bedrooms, beds, and bathrooms (already parsed above, but keep for clarity)
        // numberOfBedrooms, numberOfBeds, numberOfBathrooms already parsed above

        // Validate bedrooms, beds, and bathrooms
        if (isNaN(numberOfBedrooms) || numberOfBedrooms < 1) {
          setError("Number of bedrooms must be at least 1.")
          setIsLoading(false)
          return
        }

        if (isNaN(numberOfBeds) || numberOfBeds < 1) {
          setError("Number of beds must be at least 1.")
          setIsLoading(false)
          return
        }

        if (isNaN(numberOfBathrooms) || numberOfBathrooms < 1) {
          setError("Number of bathrooms must be at least 1.")
          setIsLoading(false)
          return
        }

        // Ensure amenities is never null - backend requires @NotNull
        const finalAmenities = amenitiesToSend.length > 0 ? amenitiesToSend : (existingAmenities.length > 0 ? existingAmenities.map((a: any) => ({ id: a.id, name: a.name || a.amenityName || "" })) : [])

        const updateRequest: any = {
          title: formDataToUse.title.trim(),
          description: formDataToUse.description.trim(),
          dailyPrice: dailyPrice,
          capacity: capacity,
          numberOfBedrooms: numberOfBedrooms,
          numberOfBeds: numberOfBeds,
          numberOfBathrooms: numberOfBathrooms,
          typeId: Number.parseInt(formDataToUse.typeId),
          address: formDataToUse.address.trim(),
          city: formDataToUse.city.trim(),
          country: formDataToUse.country.trim(),
          zipCode: formDataToUse.zipCode ? formDataToUse.zipCode.trim() : null,
          // Backend @NotNull validation requires amenities to be present (not null)
          amenities: finalAmenities,
        }

        try {
          await apiClient.properties.update(propertyId, updateRequest)
        } catch (err: any) {
          throw err
        }

        // Note: Other fields (title, address, bedrooms, etc.) are not supported by current backend API
        // They would need to be added to UpdatePropertyRequest in the backend

        if (onSuccess) {
          onSuccess()
        }

        alert("Property updated successfully!")
        setIsLoading(false)
        return
      }

      // Create mode
      // coverImageName is optional string in backend DTO – use undefined when no image
      const coverImageName = images[0]?.name

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
        coverImageName,
        discountPlan: (discountPlans.fiveDays || discountPlans.fifteenDays || discountPlans.oneMonth) ? {
          ...(discountPlans.fiveDays && { fiveDays: 10 }),
          ...(discountPlans.fifteenDays && { fifteenDays: 15 }),
          ...(discountPlans.oneMonth && { oneMonth: 20 }),
        } : null,
      }

      const result = await apiClient.properties.create(createRequest, images)

      try {
        const userData = await apiClient.users.getMe()

        const frontendRoles = (userData.roles || []).map((r: string) => {
          if (r === "HOST") return "POSTER"
          if (r === "TENANT") return "USER"
          if (r === "ADMIN") return "ADMIN"
          return r
        })

        const updatedUser = {
          ...user,
          roles: frontendRoles.length > 0 ? frontendRoles : user?.roles || ["USER"],
          walletAddress: userData.walletAddress || user?.walletAddress,
        }

        localStorage.setItem("user", JSON.stringify(updatedUser))
        localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "derent5_user_data", JSON.stringify(updatedUser))
        window.dispatchEvent(new Event("auth-state-changed"))
      } catch (error) {
        console.error("Failed to refresh user data:", error)
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        typeId: "1",
        dailyPrice: "",
        depositAmount: "",
        negotiationPercentage: "",
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
      setImages([])
      setImagePreview([])
      setDiscountPlans({
        fiveDays: false,
        fifteenDays: false,
        oneMonth: false,
      })

      // Show success message
      setError("")
      alert("Property created successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create property")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {isEditMode ? "Edit Property" : "Add New Property"}
      </h2>
      <p className="text-gray-600 mb-6">
        {isEditMode ? "Update the details of your property" : "Fill in the details to post your property"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Images Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload Images</h3>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-xl p-8 text-center hover:bg-teal-50/50 hover:border-teal-500 transition-all group cursor-pointer">
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-teal-600 hover:text-teal-700 font-medium">Click to upload</span> or drag and drop
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB {!isEditMode && "(5-10 images required)"}
                {!isEditMode && images.length > 0 && images.length < 10 && " - You can add more images"}
              </p>
            </div>

            {imagePreview.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {imagePreview.map((preview, i) => (
                    <div key={i} className="relative group">
                      <div className="relative h-24 rounded-lg overflow-hidden border-2 border-gray-200">
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
                {!isEditMode && (
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
                )}
              </div>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
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
                className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all h-24"
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
                  step="0.001"
                  min="0"
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="0.05"
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
                  step="0.001"
                  min="0"
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="0.1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Security deposit amount in Moroccan Dirham (MAD)</p>
              </div>
            </div>

            <div className="w-full">
              <label htmlFor="negotiationPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                Negotiation Percentage (%) *
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
              />
              <p className="text-xs text-gray-500 mt-1">Enter the negotiation percentage (0-100%)</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Details</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Discount Plan</h3>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">5 Days</span>
                  <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded">10% OFF</span>
                </div>
                <p className="text-xs text-gray-600">Get 10% discount when booking for 5 days or more</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={discountPlans.fiveDays}
                  onCheckedChange={(checked) =>
                    setDiscountPlans((prev) => ({ ...prev, fiveDays: checked }))
                  }
                />
                <span className="text-xs text-gray-700 min-w-[60px]">
                  {discountPlans.fiveDays ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">15 Days</span>
                  <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded">15% OFF</span>
                </div>
                <p className="text-xs text-gray-600">Get 15% discount when booking for 15 days or more</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={discountPlans.fifteenDays}
                  onCheckedChange={(checked) =>
                    setDiscountPlans((prev) => ({ ...prev, fifteenDays: checked }))
                  }
                />
                <span className="text-xs text-gray-700 min-w-[60px]">
                  {discountPlans.fifteenDays ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">1 Month+</span>
                  <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded">20% OFF</span>
                </div>
                <p className="text-xs text-gray-600">Get 20% discount when booking for a month or more</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={discountPlans.oneMonth}
                  onCheckedChange={(checked) =>
                    setDiscountPlans((prev) => ({ ...prev, oneMonth: checked }))
                  }
                />
                <span className="text-xs text-gray-700 min-w-[60px]">
                  {discountPlans.oneMonth ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Location</h3>
            <Button
              type="button"
              onClick={() => getCurrentLocation()}
              disabled={isGettingLocation}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Use GPS
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
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setFormData({
                title: "",
                description: "",
                typeId: "1",
                dailyPrice: "",
                depositAmount: "",
                negotiationPercentage: "",
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
              setImages([])
              setImagePreview([])
              setDiscountPlans({
                fiveDays: false,
                fifteenDays: false,
                oneMonth: false,
              })
              setError("")
            }}
          >
            Clear
          </Button>
          <Button type="submit" className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 h-10 shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
            {isLoading ? (isEditMode ? "Updating..." : "Publishing...") : (isEditMode ? "Update Property" : "Publish Property")}
          </Button>
        </div>
      </form>
    </Card>
  )
}

