"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Users, Search, Filter } from "lucide-react"
import { useProperties } from "@/hooks/useProperties"
import type { Property } from "@/types"
import { formatPrice } from "@/utils/format"

export function BrowsePage() {
  const navigate = useNavigate()
  const { properties, loading } = useProperties()
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [priceRange, setPriceRange] = useState([0, 10000])

  useEffect(() => {
    let filtered = properties.filter((p) => p.status === "APPROVED")

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.address.city.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])

    setFilteredProperties(filtered)
  }, [properties, searchTerm, priceRange])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="10000"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number.parseInt(e.target.value), priceRange[1]])}
                placeholder="Min price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <span className="flex items-center text-gray-500">-</span>
              <input
                type="number"
                min="0"
                max="10000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number.parseInt(e.target.value)])}
                placeholder="Max price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <button className="flex items-center justify-center gap-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
              <Filter size={20} />
              Advanced Filters
            </button>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No properties found</p>
            <button
              onClick={() => {
                setSearchTerm("")
                setPriceRange([0, 10000])
              }}
              className="text-teal-600 hover:underline font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                onClick={() => navigate(`/property/${property.id}`)}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-64 bg-gray-200 overflow-hidden">
                  {property.propertyImages.length > 0 ? (
                    <img
                      src={property.propertyImages[0].url || "/placeholder.svg"}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                  )}
                  <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow">
                    <p className="font-semibold text-teal-600">{formatPrice(property.price)}/mo</p>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{property.title}</h3>

                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                    <MapPin size={16} />
                    <span>
                      {property.address.city}, {property.address.country}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{property.description}</p>

                  <div className="flex gap-4 text-sm text-gray-700 border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      <span>{property.capacity} guests</span>
                    </div>
                    {property.numberOfBedrooms && (
                      <div className="flex items-center gap-1">
                        <span>{property.numberOfBedrooms} bed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
