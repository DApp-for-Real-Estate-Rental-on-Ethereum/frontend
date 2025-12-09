"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/services/api"
import type { Property } from "@/lib/types"
import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MapPin, Star, Users, Loader2, Bed, Bath, Search } from "lucide-react"

interface Booking {
  checkInDate: string
  checkOutDate: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")

  const [searchLocation, setSearchLocation] = useState("")
  const [checkInDate, setCheckInDate] = useState("")
  const [checkOutDate, setCheckOutDate] = useState("")
  const [searchGuests, setSearchGuests] = useState("")

  const today = new Date().toISOString().split('T')[0]

  const handleSearch = useCallback(async () => {
    setIsSearching(true)
    try {
      let filtered = properties.filter((p) => p.status === "APPROVED")

      if (searchLocation) {
        filtered = filtered.filter(
          (p) =>
            p.title?.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.address?.city?.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.address?.country?.toLowerCase().includes(searchLocation.toLowerCase())
        )
      }

      if (searchGuests) {
        const guestCount = parseInt(searchGuests)
        if (!isNaN(guestCount) && guestCount > 0) {
          filtered = filtered.filter((p) => p.capacity >= guestCount)
        }
      }

      if (checkInDate && checkOutDate) {
        const checkIn = new Date(checkInDate)
        const checkOut = new Date(checkOutDate)
        checkIn.setHours(0, 0, 0, 0)
        checkOut.setHours(0, 0, 0, 0)
        
        if (checkOut <= checkIn) {
          setFilteredProperties(filtered)
          setIsSearching(false)
          return
        }

        const availableProperties = await Promise.all(
          filtered.map(async (property) => {
            try {
              const bookings = await apiClient.bookings.getConfirmedBookingsByProperty(String(property.id))
              
              const hasOverlap = bookings.some((booking: Booking) => {
                const bookingCheckIn = new Date(booking.checkInDate)
                const bookingCheckOut = new Date(booking.checkOutDate)
                bookingCheckIn.setHours(0, 0, 0, 0)
                bookingCheckOut.setHours(0, 0, 0, 0)
                
                return checkIn < bookingCheckOut && checkOut > bookingCheckIn
              })
              
              return !hasOverlap
            } catch (error) {
              return true
            }
          })
        )

        filtered = filtered.filter((_, index) => availableProperties[index])
      }

      setFilteredProperties(filtered)
    } catch (error) {
      setFilteredProperties(properties.filter((p) => p.status === "APPROVED"))
    } finally {
      setIsSearching(false)
    }
  }, [properties, searchLocation, searchGuests, checkInDate, checkOutDate])

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true)
        setError("")
        const data = await apiClient.properties.getAll()
        const approvedProperties = data.filter((p) => p.status === "APPROVED")
        setProperties(approvedProperties)
        setFilteredProperties(approvedProperties)
      } catch (err: any) {
        if (err?.isConnectionError) {
          setError(
            "Cannot connect to the backend server. Please make sure the property-service is running on port 8081."
          )
        } else {
          setError(err instanceof Error ? err.message : "Failed to load properties")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [])

  useEffect(() => {
    if (!checkInDate && !checkOutDate) {
      let filtered = properties.filter((p) => p.status === "APPROVED")

      if (searchLocation) {
        filtered = filtered.filter(
          (p) =>
            p.title?.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.address?.city?.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.address?.country?.toLowerCase().includes(searchLocation.toLowerCase())
        )
      }

      if (searchGuests) {
        const guestCount = parseInt(searchGuests)
        if (!isNaN(guestCount) && guestCount > 0) {
          filtered = filtered.filter((p) => p.capacity >= guestCount)
        }
      }

      setFilteredProperties(filtered)
    }
  }, [properties, searchLocation, searchGuests, checkInDate, checkOutDate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600 text-base">Loading properties...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-600 mb-4 text-base">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-teal-600 hover:text-teal-700 font-medium text-base"
          >
            Try again
          </button>
        </Card>
      </div>
    )
  }

  const getPropertyImage = (property: Property) => {
    if (!property.propertyImages || property.propertyImages.length === 0) {
      return null
    }
    const coverImage = property.propertyImages.find((img) => img.cover)
    if (coverImage) {
      return coverImage.url
    }
    return property.propertyImages[0].url
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <section className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="shadow-lg border-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0 divide-x divide-gray-200">
              <div className="p-4 hover:bg-gray-50 transition-colors">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Where</label>
                <input
                  type="text"
                  placeholder="Search destinations"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-0 py-1 border-0 focus:outline-none text-base text-gray-600 placeholder-gray-400"
                />
              </div>
              <div className="p-4 hover:bg-gray-50 transition-colors">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Check-in</label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  min={today}
                  className="w-full px-0 py-1 border-0 focus:outline-none text-base text-gray-600 placeholder-gray-400 cursor-pointer"
                />
              </div>
              <div className="p-4 hover:bg-gray-50 transition-colors">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Check-out</label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate || today}
                  className="w-full px-0 py-1 border-0 focus:outline-none text-base text-gray-600 placeholder-gray-400 cursor-pointer"
                />
              </div>
              <div className="p-4 hover:bg-gray-50 transition-colors flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Who</label>
                  <input
                    type="number"
                    min="1"
                    value={searchGuests}
                    onChange={(e) => setSearchGuests(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Add guests"
                    className="w-full px-0 py-1 border-0 focus:outline-none text-base text-gray-600 placeholder-gray-400"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-teal-600 hover:bg-teal-700 h-12 w-12 rounded-full p-0 flex-shrink-0 disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Discover Properties</h1>
          <p className="text-lg text-gray-600">
            Explore {filteredProperties.length} {filteredProperties.length === 1 ? "beautiful property" : "beautiful properties"} available for rent
          </p>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-xl font-medium">No approved properties found</p>
            <p className="text-gray-400 text-base mt-2">Check back later for new listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredProperties.map((property) => {
              const imageUrl = getPropertyImage(property)
              const fullImageUrl = getImageUrl(imageUrl)

              return (
                <Link href={`/property/${property.id}`} key={property.id}>
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-200 bg-white rounded-xl">
                    <div className="relative h-64 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={fullImageUrl}
                          alt={property.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <div className="text-center">
                            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <span className="text-gray-500 text-sm">No image available</span>
                          </div>
                        </div>
                      )}
                      <button
                        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-2.5 hover:bg-white shadow-lg transition-all duration-200 z-10 hover:scale-110"
                        onClick={(e) => {
                          e.preventDefault()
                        }}
                      >
                        <Heart className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" />
                      </button>
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-900">4.8</span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-1 group-hover:text-teal-600 transition-colors">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="w-4 h-4 mr-1.5 text-teal-600 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {property.address?.city}, {property.address?.country}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-teal-600">
                              {property.dailyPrice?.toFixed(4) || property.price?.toFixed(4) || "N/A"}
                            </span>
                            <span className="text-lg font-semibold text-teal-600">ETH</span>
                            <span className="text-sm text-gray-500 ml-1">/day</span>
                          </div>
                          {property.depositAmount && property.depositAmount > 0 && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-semibold text-orange-600">
                                Deposit: {property.depositAmount.toFixed(4)} ETH
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 gap-6 mb-4">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-teal-600" />
                          <span className="font-medium">{property.capacity} guests</span>
                        </span>
                        {property.numberOfBedrooms && (
                          <span className="flex items-center gap-2">
                            <Bed className="w-4 h-4 text-teal-600" />
                            <span className="font-medium">{property.numberOfBedrooms}</span>
                          </span>
                        )}
                        {property.numberOfBathrooms && (
                          <span className="flex items-center gap-2">
                            <Bath className="w-4 h-4 text-teal-600" />
                            <span className="font-medium">{property.numberOfBathrooms}</span>
                          </span>
                        )}
                      </div>

                      {property.amenities && property.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          {property.amenities.slice(0, 3).map((a) => (
                            <span
                              key={a.id}
                              className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full font-medium border border-teal-100"
                            >
                              {a.name}
                            </span>
                          ))}
                          {property.amenities.length > 3 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium">
                              +{property.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
