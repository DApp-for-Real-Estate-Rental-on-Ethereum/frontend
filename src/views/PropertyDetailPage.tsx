"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { MapPin, Users, Bed, Bath, ChevronLeft, ChevronRight, MessageCircle, Heart } from "lucide-react"
import { apiClient } from "@/services/api"
import type { Property } from "@/types"
import { formatPrice } from "@/utils/format"

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        if (!id) return
        const data = await apiClient.properties.getById(id)
        setProperty(data)
      } catch (error) {
        console.error("[v0] Error fetching property:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Property not found</p>
          <button onClick={() => navigate("/browse")} className="text-teal-600 hover:underline font-medium">
            Back to browse
          </button>
        </div>
      </div>
    )
  }

  const images = property.propertyImages || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            <ChevronLeft size={20} />
            Back
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative bg-gray-200 rounded-xl overflow-hidden mb-8 h-96">
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex].url || "/placeholder.svg"}
                alt={`Property ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 hover:bg-gray-100"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 hover:bg-gray-100"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentImageIndex ? "bg-white" : "bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No images available</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>

              <div className="flex items-center gap-4 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={20} />
                  <span>
                    {property.address.address}, {property.address.city}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">{property.description}</p>

              {/* Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-200 pt-6">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Guests</p>
                  <div className="flex items-center gap-2 font-semibold">
                    <Users size={20} className="text-teal-600" />
                    {property.capacity}
                  </div>
                </div>
                {property.numberOfBedrooms && (
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Bedrooms</p>
                    <div className="flex items-center gap-2 font-semibold">
                      <Bed size={20} className="text-teal-600" />
                      {property.numberOfBedrooms}
                    </div>
                  </div>
                )}
                {property.numberOfBathrooms && (
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Bathrooms</p>
                    <div className="flex items-center gap-2 font-semibold">
                      <Bath size={20} className="text-teal-600" />
                      {property.numberOfBathrooms}
                    </div>
                  </div>
                )}
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center gap-3">
                        {amenity.icon && (
                          <img src={amenity.icon || "/placeholder.svg"} alt={amenity.name} className="w-6 h-6" />
                        )}
                        <span className="text-gray-700">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 sticky top-24">
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-1">Price per month</p>
                <p className="text-4xl font-bold text-teal-600">{formatPrice(property.price)}</p>
              </div>

              <div className="space-y-3">
                <button className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-semibold">
                  Reserve
                </button>

                <div className="flex gap-3">
                  <button className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Heart size={20} />
                    Save
                  </button>

                  <button className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                    <MessageCircle size={20} />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
