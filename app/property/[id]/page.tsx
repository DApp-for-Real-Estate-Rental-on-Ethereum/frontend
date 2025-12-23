"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/services/api"
import { useAuth } from "@/lib/hooks/use-auth"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Heart, Share2, ChevronLeft, ChevronRight, Wifi, Loader2, Bed, Bath, Users, Star, X } from "lucide-react"
import type { Property } from "@/lib/types"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

export default function PropertyDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user, isAuthenticated } = useAuth()
    const [property, setProperty] = useState<Property | null>(null)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isBooking, setIsBooking] = useState(false)
    const [bookingError, setBookingError] = useState("")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [guests, setGuests] = useState(1)

    // Helper function to format date as YYYY-MM-DD without timezone issues
    const formatDateString = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Helper to get check-in and check-out dates from range
    const checkInDate = dateRange?.from
    const checkOutDate = dateRange?.to
    const [showAllDescription, setShowAllDescription] = useState(false)
    const [showAllAmenities, setShowAllAmenities] = useState(false)

    // Property info for booking (price, discount, negotiation)
    const [propertyInfo, setPropertyInfo] = useState<{
        pricePerNight?: number
        isNegotiable?: boolean
        discountEnabled?: boolean
    } | null>(null)
    const [basePrice, setBasePrice] = useState<number | null>(null)
    const [finalPrice, setFinalPrice] = useState<number | null>(null)
    const [discountInfo, setDiscountInfo] = useState<{ percent: number; amount: number } | null>(null)
    const [requestedPrice, setRequestedPrice] = useState("")
    const [loadingPropertyInfo, setLoadingPropertyInfo] = useState(false)
    const [confirmedBookings, setConfirmedBookings] = useState<any[]>([])
    const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxImageIndex, setLightboxImageIndex] = useState(0)

    const propertyId = params.id as string

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Convert blocked dates from Set<string> to Date[] for react-day-picker
    const disabledDates = Array.from(blockedDates).map(dateStr => {
        const date = new Date(dateStr)
        date.setHours(0, 0, 0, 0)
        return date
    })

    // Function to check if a date should be disabled
    const isDateDisabled = (date: Date) => {
        const dateStr = formatDateString(date)
        return blockedDates.has(dateStr)
    }

    // Validate selected dates don't overlap with confirmed bookings
    const validateDates = (from: Date | undefined, to: Date | undefined) => {
        if (!from || !to) return true // Allow empty dates

        // Check if any date in the range is blocked
        const currentDate = new Date(from)
        currentDate.setHours(0, 0, 0, 0)
        const endDate = new Date(to)
        endDate.setHours(0, 0, 0, 0)

        while (currentDate <= endDate) {
            const dateStr = formatDateString(currentDate)
            if (blockedDates.has(dateStr)) {
                return false
            }
            currentDate.setDate(currentDate.getDate() + 1)
        }

        return true
    }

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                setIsLoading(true)
                const data = await apiClient.properties.getById(propertyId)
                setProperty(data)
            } catch (error: any) {
                if (error?.isConnectionError) {
                    // Show error but don't redirect
                    return
                }
                // Only redirect if property not found (404) or other critical errors
                if (error?.message?.includes("404") || error?.message?.includes("not found")) {
                    router.push("/properties")
                }
            } finally {
                setIsLoading(false)
            }
        }

        if (propertyId) {
            fetchProperty()
        }
    }, [propertyId, router])

    // Fetch confirmed bookings for this property to block dates
    useEffect(() => {
        const fetchConfirmedBookings = async () => {
            if (!propertyId) return

            try {
                const bookings = await apiClient.bookings.getConfirmedBookingsByProperty(propertyId)
                setConfirmedBookings(bookings)

                // Generate set of blocked dates
                const blocked = new Set<string>()
                bookings.forEach((booking: any) => {
                    const checkIn = new Date(booking.checkInDate)
                    const checkOut = new Date(booking.checkOutDate)

                    // Add all dates from check-in to check-out (inclusive)
                    const currentDate = new Date(checkIn)
                    while (currentDate <= checkOut) {
                        blocked.add(formatDateString(currentDate))
                        currentDate.setDate(currentDate.getDate() + 1)
                    }
                })

                setBlockedDates(blocked)
            } catch (error) {
                // Don't show error to user, just log it
            }
        }

        if (propertyId) {
            fetchConfirmedBookings()
        }
    }, [propertyId])

    // Send userId and propertyId to booking-service when page loads (if user is authenticated)
    useEffect(() => {
        const sendInitData = async () => {
            if (!propertyId) return

            // Only send if user is authenticated
            if (isAuthenticated && user?.id) {
                try {
                    const userIdNum = parseInt(user.id)
                    if (!isNaN(userIdNum)) {
                        const BOOKING_API_BASE_URL = process.env.NEXT_PUBLIC_BOOKING_API_BASE_URL || "http://localhost:8083"
                        await fetch(`${BOOKING_API_BASE_URL}/api/bookings/init`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                userId: userIdNum,
                                propertyId: propertyId,
                            }),
                        })
                    }
                } catch (err) {
                    // Silently fail - not critical
                }
            }
        }

        sendInitData()
    }, [propertyId, isAuthenticated, user?.id])

    // Keyboard navigation for lightbox
    useEffect(() => {
        if (!lightboxOpen || !property?.propertyImages || property.propertyImages.length === 0) return

        const imagesCount = property.propertyImages.length

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setLightboxImageIndex((prev) => (prev === 0 ? imagesCount - 1 : prev - 1))
            } else if (e.key === 'ArrowRight') {
                setLightboxImageIndex((prev) => (prev === imagesCount - 1 ? 0 : prev + 1))
            } else if (e.key === 'Escape') {
                setLightboxOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [lightboxOpen, property?.propertyImages?.length])

    // Fetch property info for booking (price, discount, negotiation) when dates change
    useEffect(() => {
        const fetchPropertyInfo = async () => {
            if (!propertyId || !checkInDate || !checkOutDate) {
                setBasePrice(null)
                setFinalPrice(null)
                setDiscountInfo(null)
                setPropertyInfo(null)
                return
            }

            setLoadingPropertyInfo(true)
            try {
                const checkIn = new Date(checkInDate)
                const checkOut = new Date(checkOutDate)
                checkIn.setHours(0, 0, 0, 0)
                checkOut.setHours(0, 0, 0, 0)
                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

                if (nights <= 0) {
                    setBasePrice(null)
                    setFinalPrice(null)
                    setDiscountInfo(null)
                    setPropertyInfo(null)
                    return
                }

                // Fetch property info from booking-service
                const info = await apiClient.bookings.getPropertyInfo(propertyId)

                // Convert pricePerNight to number if it's a string
                const pricePerNightNum = typeof info.pricePerNight === 'string'
                    ? parseFloat(info.pricePerNight)
                    : info.pricePerNight

                setPropertyInfo({
                    pricePerNight: pricePerNightNum,
                    isNegotiable: info.isNegotiable,
                    discountEnabled: info.discountEnabled,
                })

                if (info && pricePerNightNum) {
                    const calculatedBasePrice = pricePerNightNum * nights
                    setBasePrice(calculatedBasePrice)

                    // Calculate discount
                    let discountPercent = 0
                    if (info.discountEnabled) {
                        if (nights > 30) {
                            discountPercent = 20
                        } else if (nights > 15) {
                            discountPercent = 15
                        } else if (nights > 5) {
                            discountPercent = 10
                        }
                    }

                    if (discountPercent > 0) {
                        const discountAmount = calculatedBasePrice * (discountPercent / 100)
                        const calculatedFinalPrice = calculatedBasePrice - discountAmount
                        setFinalPrice(calculatedFinalPrice)
                        setDiscountInfo({
                            percent: discountPercent,
                            amount: discountAmount
                        })
                    } else {
                        setFinalPrice(calculatedBasePrice)
                        setDiscountInfo(null)
                    }
                }
            } catch (err) {
                setBasePrice(null)
                setFinalPrice(null)
                setDiscountInfo(null)
                setPropertyInfo(null)
            } finally {
                setLoadingPropertyInfo(false)
            }
        }

        fetchPropertyInfo()
    }, [propertyId, checkInDate, checkOutDate])

    // Helper function to get the cover image or first image
    const getPropertyImage = (property: Property, index?: number) => {
        if (!property.propertyImages || property.propertyImages.length === 0) {
            return null
        }
        // If index is provided, return that image
        if (index !== undefined && property.propertyImages[index]) {
            return property.propertyImages[index].url
        }
        // Find cover image first
        const coverImage = property.propertyImages.find((img) => img.cover)
        if (coverImage) {
            return coverImage.url
        }
        // Otherwise return first image
        return property.propertyImages[0].url
    }

    // Helper function to build full image URL
    const getImageUrl = (url: string | null | undefined) => {
        if (!url) return "/houses_placeholder.png"
        // If URL starts with http, return as is
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url
        }
        // If URL starts with /uploads, prepend property-service URL
        if (url.startsWith("/uploads")) {
            return `http://localhost:8081${url}`
        }
        // Otherwise return as is
        return url
    }

    // Get all images sorted (cover first, then others)
    const getAllImages = (property: Property) => {
        if (!property.propertyImages || property.propertyImages.length === 0) {
            return []
        }
        const coverImage = property.propertyImages.find((img) => img.cover)
        const otherImages = property.propertyImages.filter((img) => !img.cover)
        if (coverImage) {
            return [coverImage, ...otherImages]
        }
        return property.propertyImages
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading property details...</p>
                </div>
            </div>
        )
    }

    if (!property) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <p className="text-gray-600 mb-4">Property not found</p>
                <Link href="/properties">
                    <Button className="bg-teal-600 hover:bg-teal-700">Back to Properties</Button>
                </Link>
            </div>
        )
    }

    const images = getAllImages(property)
    const mainImage = images[0]
    const otherImages = images.slice(1, 5)

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }

    const handleBooking = async () => {
        if (!isAuthenticated || !user) {
            router.push("/login?redirect=/property/" + propertyId)
            return
        }

        if (!checkInDate || !checkOutDate) {
            setBookingError("Please select check-in and check-out dates")
            return
        }

        // Validate dates
        const checkIn = new Date(checkInDate)
        const checkOut = new Date(checkOutDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (checkIn < today) {
            setBookingError("Check-in date must be today or later")
            return
        }

        if (checkOut <= checkIn) {
            setBookingError("Check-out date must be after check-in date")
            return
        }

        // Validate dates don't overlap with confirmed bookings
        if (!validateDates(checkInDate, checkOutDate)) {
            setBookingError("Selected dates overlap with a confirmed booking. Please choose different dates.")
            return
        }

        setIsBooking(true)
        setBookingError("")

        try {
            // Convert userId to number (user-service uses Long)
            const userIdNum = parseInt(user.id)

            if (isNaN(userIdNum)) {
                throw new Error("Invalid user ID")
            }

            // propertyId is already String (UUID) - no conversion needed
            // Prepare booking data - convert Date objects to YYYY-MM-DD strings
            // Use formatDateString helper to avoid timezone issues with toISOString()
            const bookingData: any = {
                userId: userIdNum,
                propertyId: propertyId, // Keep as String (UUID)
                checkInDate: formatDateString(checkInDate),
                checkOutDate: formatDateString(checkOutDate),
                numberOfGuests: guests,
            }

            // Add requestedPrice if property has negotiation percentage > 0 (used as nicotine percentage) and user provided a price
            // Backend will validate if the price is acceptable based on negotiation percentage
            if (property?.negotiationPercentage !== undefined && property.negotiationPercentage !== null && property.negotiationPercentage > 0 && requestedPrice) {
                const requestedPriceNum = parseFloat(requestedPrice)

                if (isNaN(requestedPriceNum) || requestedPriceNum <= 0) {
                    setBookingError("Please enter a valid requested price")
                    setIsBooking(false)
                    return
                }

                // Send to backend - backend will validate based on negotiation percentage (used as nicotine percentage)
                bookingData.requestedPrice = requestedPriceNum
            }

            // Send booking request to booking-service
            const bookingResponse = await apiClient.bookings.create(bookingData)

            // Check if booking was rejected due to invalid price
            if (bookingResponse.status === "rejected") {
                setBookingError(bookingResponse.message || "السعر غير مقبول. يرجى رفع السعر.")
                setIsBooking(false)
                return
            }

            // Poll for booking ID
            let attempts = 0
            const maxAttempts = 20
            let bookingId: number | null = null

            while (attempts < maxAttempts && !bookingId) {
                await new Promise((resolve) => setTimeout(resolve, 1500))

                try {
                    const response = await apiClient.bookings.getLastBookingId()
                    if (response && response.bookingId) {
                        bookingId = response.bookingId
                        break
                    }
                } catch (e) {
                }

                attempts++
            }

            if (bookingId) {
                // Check if booking was created without negotiation (PENDING_PAYMENT)
                // If so, redirect to payment page, otherwise redirect to my-bookings
                try {
                    // Wait a bit for booking to be fully created
                    await new Promise((resolve) => setTimeout(resolve, 500))

                    // Try to get booking status
                    const booking = await apiClient.bookings.getById(bookingId)

                    // If booking is PENDING_PAYMENT (no negotiation), redirect to payment
                    if (booking?.status === "PENDING_PAYMENT") {
                        router.push(`/payment?bookingId=${bookingId}`)
                    } else {
                        // Otherwise redirect to my-bookings
                        router.push(`/my-bookings?bookingId=${bookingId}`)
                    }
                } catch (e) {
                    // If we can't get booking status, just redirect to my-bookings
                    router.push(`/my-bookings?bookingId=${bookingId}`)
                }
            } else {
                // Still redirect even if we didn't get booking ID
                router.push("/my-bookings")
            }
        } catch (error: any) {
            setBookingError(error.message || "Failed to create booking. Please try again.")
            setIsBooking(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Title and Actions */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                        <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">
                                {property.address?.city}, {property.address?.country}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="flex items-center justify-center"
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: property.title,
                                        text: property.description,
                                        url: window.location.href,
                                    }).catch(() => { })
                                } else {
                                    navigator.clipboard.writeText(window.location.href)
                                    // You could add a toast notification here
                                }
                            }}
                        >
                            <Share2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Image Gallery Grid */}
                {images.length > 0 ? (
                    <div className="grid grid-cols-4 grid-rows-2 gap-3 mb-8 h-[500px]">
                        {/* Main Large Image */}
                        <div
                            className="col-span-2 row-span-2 relative rounded-l-2xl overflow-hidden bg-gray-200 cursor-pointer group"
                            onClick={() => {
                                setLightboxImageIndex(0)
                                setLightboxOpen(true)
                            }}
                        >
                            <Image
                                src={getImageUrl(mainImage?.url)}
                                alt={property.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.srcset = ""
                                    target.src = "/houses_placeholder.png"
                                }}
                            />
                            {images.length > 1 && (
                                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm">
                                    {images.length} photos
                                </div>
                            )}
                        </div>

                        {/* Grid of 4 smaller images */}
                        {otherImages.length > 0 ? (
                            otherImages.slice(0, 4).map((image, i) => (
                                <div
                                    key={image.id || i}
                                    className={`relative overflow-hidden bg-gray-200 cursor-pointer group ${i === 1 || i === 3 ? "rounded-r-2xl" : ""
                                        }`}
                                    onClick={() => {
                                        setLightboxImageIndex(i + 1)
                                        setLightboxOpen(true)
                                    }}
                                >
                                    <Image
                                        src={getImageUrl(image.url)}
                                        alt={`${property.title} ${i + 2}`}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.srcset = ""
                                            target.src = "/houses_placeholder.png"
                                        }}
                                    />
                                    {i === 3 && images.length > 5 && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                            <span className="text-white font-semibold text-lg">
                                                +{images.length - 5} more
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            // Fill remaining slots with placeholder if needed
                            Array.from({ length: Math.min(4, 4 - otherImages.length) }).map((_, i) => (
                                <div
                                    key={`placeholder-${i}`}
                                    className="relative overflow-hidden bg-gray-200 flex items-center justify-center"
                                >
                                    <span className="text-gray-400 text-sm">No image</span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="relative w-full h-[500px] mb-8 rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center">
                        <div className="text-center">
                            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No images available</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="col-span-2 space-y-8">
                        {/* Property Info Bar */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 pb-6 border-b flex-wrap">
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-teal-600" />
                                {property.capacity} guest{property.capacity > 1 ? "s" : ""}
                            </span>
                            {property.numberOfBedrooms && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Bed className="w-4 h-4 text-teal-600" />
                                        {property.numberOfBedrooms} bedroom{property.numberOfBedrooms > 1 ? "s" : ""}
                                    </span>
                                </>
                            )}
                            {property.numberOfBeds && (
                                <>
                                    <span>·</span>
                                    <span>{property.numberOfBeds} bed{property.numberOfBeds > 1 ? "s" : ""}</span>
                                </>
                            )}
                            {property.numberOfBathrooms && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Bath className="w-4 h-4 text-teal-600" />
                                        {property.numberOfBathrooms} bath{property.numberOfBathrooms > 1 ? "s" : ""}
                                    </span>
                                </>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-lg font-semibold">4.8</span>
                                <span className="text-gray-500">· 4 reviews</span>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="pb-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Where you'll be</h2>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-gray-900 font-medium">
                                        {property.address?.city}, {property.address?.country}
                                    </p>
                                    {property.address && (
                                        <p className="text-gray-600 text-sm mt-1">
                                            {property.address.city}, {property.address.country}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="pb-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                            <div className={`text-gray-700 leading-relaxed ${!showAllDescription ? 'line-clamp-6' : ''}`}>
                                <p className="whitespace-pre-line">{property.description}</p>
                            </div>
                            {property.description && property.description.length > 200 && (
                                <button
                                    onClick={() => setShowAllDescription(!showAllDescription)}
                                    className="mt-4 text-teal-600 font-semibold underline hover:text-teal-700"
                                >
                                    {showAllDescription ? 'Show less' : 'Show more'}
                                </button>
                            )}
                        </div>

                        {/* Amenities */}
                        {property.amenities && property.amenities.length > 0 && (
                            <div className="pb-6 border-b">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h2>
                                <div className="grid grid-cols-2 gap-y-4">
                                    {(showAllAmenities ? property.amenities : property.amenities.slice(0, 8)).map((amenity) => (
                                        <div key={amenity.id} className="flex items-center gap-3 text-gray-700">
                                            <Wifi className="w-5 h-5 text-teal-600" />
                                            <span>{amenity.name}</span>
                                        </div>
                                    ))}
                                </div>
                                {property.amenities.length > 8 && (
                                    <button
                                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                                        className="mt-4 px-6 py-2 border border-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {showAllAmenities ? 'Show less amenities' : `Show all ${property.amenities.length} amenities`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Booking Card */}
                    <div>
                        <Card className="p-6 sticky top-24 shadow-xl border-2">
                            <div className="mb-6">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-3xl font-bold text-teal-600">
                                        {property.dailyPrice?.toFixed(4) || property.price?.toFixed(4) || "N/A"}
                                    </span>
                                    <span className="text-lg font-semibold text-teal-600">MAD</span>
                                    <span className="text-sm text-gray-500">/night</span>
                                </div>
                                {property.depositAmount && property.depositAmount > 0 && (
                                    <div className="mb-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm text-gray-600">Deposit:</span>
                                            <span className="text-lg font-semibold text-orange-600">
                                                {property.depositAmount.toFixed(0)} MAD
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">4.8</span>
                                    <span>·</span>
                                    <span>4 reviews</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-900 mb-3">SELECT DATES</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="w-full border-2 border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors text-left"
                                        >
                                            {dateRange?.from && dateRange?.to ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <div className="text-xs text-gray-500 mb-1">Check-in</div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {format(dateRange.from, "MMM dd, yyyy")}
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-300">→</div>
                                                    <div className="flex-1">
                                                        <div className="text-xs text-gray-500 mb-1">Check-out</div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {format(dateRange.to, "MMM dd, yyyy")}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : dateRange?.from ? (
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-1">Check-in selected</div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {format(dateRange.from, "MMM dd, yyyy")} - Select check-out
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">Add dates</div>
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="range"
                                            selected={dateRange}
                                            onSelect={(range) => {
                                                if (!range) {
                                                    setDateRange(undefined)
                                                    setBookingError("")
                                                    return
                                                }

                                                setDateRange(range)

                                                // If both dates are selected, validate the range
                                                if (range.from && range.to) {
                                                    // Check if any date in the range is blocked
                                                    const dateStr = formatDateString(range.from)
                                                    if (blockedDates.has(dateStr)) {
                                                        setBookingError("Check-in date is already booked. Please choose a different date.")
                                                        setDateRange({ from: range.from, to: undefined })
                                                        return
                                                    }

                                                    if (!validateDates(range.from, range.to)) {
                                                        setBookingError("Selected dates overlap with a confirmed booking. Please choose different dates.")
                                                        setDateRange({ from: range.from, to: undefined })
                                                        return
                                                    }
                                                }

                                                setBookingError("")
                                            }}
                                            disabled={(date) => date < today || isDateDisabled(date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Guests Selection */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-900 mb-2">GUESTS</label>
                                <div className="flex items-center border border-gray-300 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setGuests(Math.max(1, guests - 1))}
                                        className="p-3 text-gray-600 hover:text-teal-600 disabled:opacity-50"
                                        disabled={guests <= 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1 text-center font-medium">{guests} guest{guests > 1 ? 's' : ''}</div>
                                    <button
                                        type="button"
                                        onClick={() => setGuests(Math.min(property.capacity, guests + 1))}
                                        className="p-3 text-gray-600 hover:text-teal-600 disabled:opacity-50"
                                        disabled={guests >= property.capacity}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Price Calculation */}
                            {dateRange?.from && dateRange?.to && finalPrice !== null && (
                                <div className="mb-6 space-y-3">
                                    <div className="flex justify-between text-gray-600">
                                        <span className="underline">
                                            {propertyInfo?.pricePerNight?.toFixed(0)} MAD x {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} nights
                                        </span>
                                        <span>{basePrice?.toFixed(0)} MAD</span>
                                    </div>
                                    {discountInfo && (
                                        <div className="flex justify-between text-teal-600 font-medium">
                                            <span>Long stay discount ({discountInfo.percent}%)</span>
                                            <span>-{discountInfo.amount.toFixed(0)} MAD</span>
                                        </div>
                                    )}
                                    {(property.depositAmount || 0) > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Deposit</span>
                                            <span>{(property.depositAmount || 0).toFixed(0)} MAD</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-3 flex justify-between font-bold text-lg text-gray-900">
                                        <span>Total</span>
                                        <span>{(finalPrice + (property.depositAmount || 0)).toFixed(0)} MAD</span>
                                    </div>
                                </div>
                            )}

                            {/* Negotiation Input */}
                            {propertyInfo?.isNegotiable && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Propose Price (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={requestedPrice}
                                            onChange={(e) => setRequestedPrice(e.target.value)}
                                            placeholder="Enter amount in MAD"
                                            className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                            step="0.0001"
                                            min="0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">MAD</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Owner allows price negotiation for this property
                                    </p>
                                </div>
                            )}

                            {bookingError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {bookingError}
                                </div>
                            )}

                            <Button
                                onClick={handleBooking}
                                disabled={isBooking || !dateRange?.from || !dateRange?.to}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-lg font-semibold"
                            >
                                {isBooking ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    "Reserve"
                                )}
                            </Button>

                            <p className="text-center text-xs text-gray-500 mt-4">
                                You won't be charged yet
                            </p>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Lightbox for Images */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95">
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <button
                        onClick={() => setLightboxImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                        className="absolute left-4 text-white hover:text-gray-300 p-2"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <div className="relative w-full h-full max-w-7xl max-h-[85vh] p-4 flex items-center justify-center">
                        {images[lightboxImageIndex] && (
                            <div className="relative w-full h-full">
                                <Image
                                    src={getImageUrl(images[lightboxImageIndex].url)}
                                    alt={`Gallery image ${lightboxImageIndex + 1}`}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setLightboxImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                        className="absolute right-4 text-white hover:text-gray-300 p-2"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                        {lightboxImageIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </div>
    )
}
