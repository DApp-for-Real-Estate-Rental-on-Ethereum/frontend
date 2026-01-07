"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/services/api"
import { resolveMediaUrl } from "@/lib/services/api/core"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, MapPin, Edit, Trash2, Plus, Eye, Bed, Bath, Users, Wifi, Star, Send, X, EyeOff } from "lucide-react"
import Image from "next/image"
import type { Property } from "@/lib/types"
import { AddPropertyForm } from "./AddPropertyForm"
import { EditPropertyModal } from "./EditPropertyModal"

interface PropertiesListProps {
  userId: string | number
  onUpdate?: () => void
  filter?: "all" | "draft" | "pending-approval" | "approved" | "disapproved" | "suspended" | "hidden"
}

export function PropertiesList({ userId, onUpdate, filter = "all" }: PropertiesListProps) {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [showAllDescription, setShowAllDescription] = useState(false)
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const [aiCheckInDate, setAiCheckInDate] = useState("")
  const [aiCheckOutDate, setAiCheckOutDate] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiResult, setAiResult] = useState<{
    predictedPriceMad?: number
    predictedPriceUsd?: number
    predicted_price?: number // legacy field name
    currency?: string
    recommendation?: string
    priceDifferencePercent?: number
  } | null>(null)

  useEffect(() => {
    fetchProperties()
  }, [userId])

  useEffect(() => {
    filterProperties()
  }, [properties, filter])

  // Reset AI suggestion state when closing / changing viewed property
  useEffect(() => {
    if (!viewModalOpen) {
      setAiCheckInDate("")
      setAiCheckOutDate("")
      setAiResult(null)
      setAiError("")
      setAiLoading(false)
    }
  }, [viewModalOpen])

  const fetchProperties = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.properties.getMyProperties()

      // Ensure data is an array
      if (!Array.isArray(data)) {
        setError("Invalid response format from server")
        setProperties([])
        return
      }

      setProperties(data)
    } catch (err: any) {
      setError(err.message || "Failed to load properties")
      setProperties([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }

  const filterProperties = () => {
    let filtered = [...properties]

    // Filter by status
    if (filter === "draft") {
      filtered = filtered.filter((p) => p.status === "DRAFT")
    } else if (filter === "pending-approval") {
      filtered = filtered.filter((p) => p.status === "PENDING_APPROVAL")
    } else if (filter === "approved") {
      filtered = filtered.filter((p) => p.status === "APPROVED")
    } else if (filter === "disapproved") {
      filtered = filtered.filter((p) => p.status === "DISAPPROVED")
    } else if (filter === "suspended") {
      filtered = filtered.filter((p) => p.status === "SUSPENDED")
    } else if (filter === "hidden") {
      filtered = filtered.filter((p) => p.status === "HIDDEN")
    }
    // "all" shows all properties

    setFilteredProperties(filtered)
  }

  const handleDelete = async (propertyId: string) => {
    // Delete functionality is currently disabled
    // TODO: Implement proper delete functionality
    alert("Delete functionality is currently disabled.")
    return

    // Original code (commented out for now):
    // if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
    //   return
    // }

    // setActionLoading((prev) => ({ ...prev, [propertyId]: true }))
    // setError("")

    // try {
    //   await apiClient.properties.delete(propertyId)
    //   await fetchProperties()
    //   if (onUpdate) onUpdate()
    // } catch (err: any) {
    //   setError(err.message || "Failed to delete property")
    // } finally {
    //   setActionLoading((prev) => ({ ...prev, [propertyId]: false }))
    // }
  }

  const handleSubmitForApproval = async (propertyId: string) => {
    setActionLoading((prev) => ({ ...prev, [`submit-${propertyId}`]: true }))
    setError("")

    try {
      await apiClient.properties.submitForApproval(propertyId)
      await fetchProperties()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to submit property for approval")
    } finally {
      setActionLoading((prev) => ({ ...prev, [`submit-${propertyId}`]: false }))
    }
  }

  const handleCancelRequest = async (propertyId: string) => {
    if (!window.confirm("Are you sure you want to cancel the approval request? The property will be moved back to draft.")) {
      return
    }

    setActionLoading((prev) => ({ ...prev, [`cancel-${propertyId}`]: true }))
    setError("")

    try {
      await apiClient.properties.cancelApprovalRequest(propertyId)
      await fetchProperties()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to cancel approval request")
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cancel-${propertyId}`]: false }))
    }
  }

  const handleHide = async (propertyId: string, isHidden: boolean) => {
    setActionLoading((prev) => ({ ...prev, [`hide-${propertyId}`]: true }))
    setError("")

    try {
      await apiClient.properties.hide(propertyId, isHidden)
      await fetchProperties()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setError(err.message || `Failed to ${isHidden ? "hide" : "show"} property`)
    } finally {
      setActionLoading((prev) => ({ ...prev, [`hide-${propertyId}`]: false }))
    }
  }


  const handleEdit = (propertyId: string) => {
    setEditingPropertyId(propertyId)
    setEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setEditingPropertyId(null)
    fetchProperties().then(() => {
      // Properties refreshed
    })
    if (onUpdate) {
      onUpdate()
    }
  }

  const getActionButtons = (property: Property) => {
    const status = property.status.toUpperCase()
    const buttons: React.JSX.Element[] = []

    // Common buttons for all statuses
    buttons.push(
      <Button
        key="edit"
        onClick={() => handleEdit(property.id)}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <Edit className="w-3 h-3 mr-1" />
        Edit
      </Button>
    )

    buttons.push(
      <Button
        key="view"
        onClick={() => {
          setViewingProperty(property)
          setViewModalOpen(true)
        }}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <Eye className="w-3 h-3 mr-1" />
        View
      </Button>
    )

    // Status-specific buttons
    if (status === "DRAFT") {
      buttons.push(
        <Button
          key="submit"
          onClick={() => handleSubmitForApproval(property.id)}
          disabled={actionLoading[`submit-${property.id}`]}
          className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
          size="sm"
        >
          {actionLoading[`submit-${property.id}`] ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Send className="w-3 h-3 mr-1" />
          )}
          Submit for Approval
        </Button>
      )
    } else if (status === "PENDING_APPROVAL") {
      buttons.push(
        <Button
          key="cancel"
          onClick={() => handleCancelRequest(property.id)}
          disabled={actionLoading[`cancel-${property.id}`]}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          {actionLoading[`cancel-${property.id}`] ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <X className="w-3 h-3 mr-1" />
          )}
          Cancel Request
        </Button>
      )
    } else if (status === "APPROVED") {
      buttons.push(
        <Button
          key="hide"
          onClick={() => handleHide(property.id, true)}
          disabled={actionLoading[`hide-${property.id}`]}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          {actionLoading[`hide-${property.id}`] ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <EyeOff className="w-3 h-3 mr-1" />
          )}
          Hide
        </Button>
      )
    } else if (status === "DISAPPROVED") {
      buttons.push(
        <Button
          key="resubmit"
          onClick={() => handleSubmitForApproval(property.id)}
          disabled={actionLoading[`submit-${property.id}`]}
          className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
          size="sm"
        >
          {actionLoading[`submit-${property.id}`] ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Send className="w-3 h-3 mr-1" />
          )}
          Resubmit for Approval
        </Button>
      )
    } else if (status === "HIDDEN") {
      buttons.push(
        <Button
          key="show"
          onClick={() => handleHide(property.id, false)}
          disabled={actionLoading[`hide-${property.id}`]}
          className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
          size="sm"
        >
          {actionLoading[`hide-${property.id}`] ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Eye className="w-3 h-3 mr-1" />
          )}
          Show
        </Button>
      )
    }

    // Delete button for all statuses
    buttons.push(
      <Button
        key="delete"
        onClick={() => handleDelete(property.id)}
        disabled={actionLoading[property.id]}
        variant="destructive"
        size="sm"
        className="text-xs"
      >
        {actionLoading[property.id] ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3 mr-1" />
        )}
        Delete
      </Button>
    )

    return buttons
  }


  const getPropertyImage = (property: Property) => {
    if (!property.propertyImages || property.propertyImages.length === 0) {
      return null
    }
    const coverImage = property.propertyImages.find((img) => img.cover)
    return coverImage ? coverImage.url : property.propertyImages[0].url
  }

  const getImageUrl = (url: string | null | undefined) => {
    return resolveMediaUrl(url, "/houses_placeholder.png")
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800 border-gray-200" },
      PENDING_APPROVAL: { label: "Pending Approval", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      APPROVED: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200" },
      SUSPENDED: { label: "Suspended", className: "bg-red-100 text-red-800 border-red-200" },
      HIDDEN: { label: "Hidden", className: "bg-gray-100 text-gray-800 border-gray-200" },
      VISIBLE_ONLY_FOR_TENANTS: { label: "Visible for Tenants", className: "bg-blue-100 text-blue-800 border-blue-200" },
      PENDING_DELETE: { label: "Pending Delete", className: "bg-orange-100 text-orange-800 border-orange-200" },
      DISAPPROVED: { label: "Disapproved", className: "bg-red-100 text-red-800 border-red-200" },
      WAITING_FOR_UPDATE: { label: "Waiting for Update", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    }

    const config = statusConfig[status.toUpperCase()] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-200" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const handleGetAiPriceSuggestion = async () => {
    if (!viewingProperty) return
    setAiError("")
    setAiResult(null)

    if (!aiCheckInDate || !aiCheckOutDate) {
      setAiError("Please select both check-in and check-out dates.")
      return
    }

    if (aiCheckInDate >= aiCheckOutDate) {
      setAiError("Check-out date must be after check-in date.")
      return
    }

    try {
      setAiLoading(true)
      const result = await apiClient.properties.predictPrice(
        viewingProperty.id,
        aiCheckInDate,
        aiCheckOutDate,
      )
      setAiResult(result)
    } catch (err: any) {
      setAiError(err?.message || "Failed to get AI price suggestion")
    } finally {
      setAiLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <p className="ml-4 text-gray-600">Loading properties...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-700">{error}</p>
        <Button onClick={fetchProperties} variant="outline" className="mt-4">
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div>
      {filteredProperties.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {properties.length === 0 ? "No properties yet" : "No properties found"}
          </h2>
          <p className="text-gray-600 mb-6">
            {properties.length === 0
              ? "Start by adding your first property!"
              : `No properties with status: ${filter}`}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const imageUrl = getPropertyImage(property)

            return (
              <Card key={property.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300">
                {/* Image Section */}
                <div className="relative h-48 bg-gradient-to-br from-teal-100 to-teal-200 overflow-hidden">
                  {imageUrl ? (
                    <Image
                      src={getImageUrl(imageUrl)}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-teal-300" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(property.status)}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-teal-600">
                          {property.dailyPrice?.toFixed(4) || property.price?.toFixed(4) || "N/A"}
                        </span>
                        <span className="text-sm font-semibold text-gray-600">MAD/day</span>
                      </div>
                      {property.depositAmount && property.depositAmount > 0 && (
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-semibold text-orange-600">
                            {property.depositAmount.toFixed(4)}
                          </span>
                          <span className="text-xs text-gray-500">MAD deposit</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                    {property.title}
                  </h3>
                  {property.address && (
                    <div className="flex items-center text-gray-600 text-sm mb-4">
                      <MapPin className="w-4 h-4 mr-1.5 text-teal-600 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {property.address.city}, {property.address.country}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Price</span>
                      <span className="font-semibold text-teal-600">
                        {property.dailyPrice?.toFixed(0) || property.price?.toFixed(0) || "N/A"} MAD/day
                      </span>
                    </div>
                    {property.depositAmount && property.depositAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Deposit</span>
                        <span className="font-semibold text-orange-600">
                          {property.depositAmount.toFixed(0)} MAD
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Capacity</span>
                      <span className="font-semibold text-gray-900">{property.capacity} guests</span>
                    </div>
                    {property.numberOfBedrooms && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Bedrooms</span>
                        <span className="font-semibold text-gray-900">{property.numberOfBedrooms}</span>
                      </div>
                    )}
                    {property.numberOfBathrooms && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Bathrooms</span>
                        <span className="font-semibold text-gray-900">{property.numberOfBathrooms}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {getActionButtons(property)}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Property Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Add New Property</DialogTitle>
          </DialogHeader>
          <AddPropertyForm
            isEditMode={false}
            onSuccess={() => {
              setAddModalOpen(false)
              fetchProperties()
              if (onUpdate) onUpdate()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editModalOpen && editingPropertyId && (
        <EditPropertyModal
          propertyId={editingPropertyId}
          onClose={() => {
            setEditModalOpen(false)
            setEditingPropertyId(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Property Details</DialogTitle>
          </DialogHeader>

          {viewingProperty && (
            <div className="space-y-6 mt-4">
              {/* Image Gallery Grid */}
              {(() => {
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

                const images = getAllImages(viewingProperty)
                const mainImage = images[0]
                const otherImages = images.slice(1, 5)

                return images.length > 0 ? (
                  <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[400px]">
                    {/* Main Large Image */}
                    <div className="col-span-2 row-span-2 relative rounded-l-2xl overflow-hidden bg-gray-200">
                      <Image
                        src={getImageUrl(mainImage?.url)}
                        alt={viewingProperty.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>

                    {/* Grid of 4 smaller images */}
                    {otherImages.length > 0 ? (
                      otherImages.map((image, i) => (
                        <div
                          key={image.id || i}
                          className={`relative overflow-hidden bg-gray-200 ${i === 1 || i === 3 ? "rounded-r-2xl" : ""}`}
                        >
                          <Image
                            src={getImageUrl(image.url)}
                            alt={`${viewingProperty.title} ${i + 2}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
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
                  <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No images available</p>
                    </div>
                  </div>
                )
              })()}

              {/* Property Info Bar */}
              <div className="flex items-center gap-4 text-sm text-gray-600 pb-6 border-b flex-wrap">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-teal-600" />
                  {viewingProperty.capacity} guest{viewingProperty.capacity > 1 ? "s" : ""}
                </span>
                {viewingProperty.numberOfBedrooms && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Bed className="w-4 h-4 text-teal-600" />
                      {viewingProperty.numberOfBedrooms} bedroom{viewingProperty.numberOfBedrooms > 1 ? "s" : ""}
                    </span>
                  </>
                )}
                {viewingProperty.numberOfBeds && (
                  <>
                    <span>·</span>
                    <span>{viewingProperty.numberOfBeds} bed{viewingProperty.numberOfBeds > 1 ? "s" : ""}</span>
                  </>
                )}
                {viewingProperty.numberOfBathrooms && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Bath className="w-4 h-4 text-teal-600" />
                      {viewingProperty.numberOfBathrooms} bath{viewingProperty.numberOfBathrooms > 1 ? "s" : ""}
                    </span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">4.8</span>
                  <span className="text-gray-500">· 4 reviews</span>
                </div>
              </div>

              {/* Price */}
              <div className="pb-6 border-b">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {viewingProperty.dailyPrice ? `${viewingProperty.dailyPrice}` : viewingProperty.price ? `${viewingProperty.price}` : "N/A"}
                  </span>
                  <span className="text-lg font-semibold text-teal-600">MAD</span>
                  <span className="text-sm text-gray-500">/day</span>
                </div>
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">
                    AI Price Suggestion (per night)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        Check-in date
                      </label>
                      <input
                        type="date"
                        value={aiCheckInDate}
                        onChange={(e) => setAiCheckInDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        Check-out date
                      </label>
                      <input
                        type="date"
                        value={aiCheckOutDate}
                        onChange={(e) => setAiCheckOutDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGetAiPriceSuggestion}
                      disabled={aiLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Getting suggestion...
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4" />
                          Get AI suggestion
                        </>
                      )}
                    </button>
                  </div>
                  {aiError && (
                    <p className="text-xs text-red-600">{aiError}</p>
                  )}
                  {aiResult && (
                    <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-gray-800 space-y-1">
                      {(() => {
                        const price = aiResult.predictedPriceMad ?? aiResult.predicted_price
                        const currency = aiResult.currency || "MAD"
                        return (
                          <div className="flex items-baseline gap-1">
                            <span className="font-semibold text-teal-700">
                              {price !== undefined ? price.toFixed(0) : "N/A"} {currency}
                            </span>
                            <span className="text-gray-500">/ night (AI predicted)</span>
                          </div>
                        )
                      })()}
                      {aiResult.recommendation && (
                        <div className="text-gray-700">
                          Recommendation: <span className="font-semibold text-teal-700">{aiResult.recommendation}</span>
                          {aiResult.priceDifferencePercent !== undefined && (
                            <span className="text-gray-500"> ({aiResult.priceDifferencePercent.toFixed(1)}%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {viewingProperty.address && (
                <div className="pb-6 border-b">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="font-semibold">{viewingProperty.address.city}, {viewingProperty.address.country}</p>
                      {viewingProperty.address.address && (
                        <p className="text-sm text-gray-600">{viewingProperty.address.address}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="pb-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <div className={`text-gray-700 leading-relaxed ${!showAllDescription ? 'line-clamp-6' : ''}`}>
                  <p className="whitespace-pre-line">{viewingProperty.description}</p>
                </div>
                {viewingProperty.description && viewingProperty.description.length > 200 && (
                  <button
                    onClick={() => setShowAllDescription(!showAllDescription)}
                    className="mt-4 text-teal-600 font-semibold underline hover:text-teal-700"
                  >
                    {showAllDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {/* Amenities */}
              {viewingProperty.amenities && viewingProperty.amenities.length > 0 && (
                <div className="pb-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h2>
                  <div className="grid grid-cols-2 gap-y-4">
                    {(showAllAmenities ? viewingProperty.amenities : viewingProperty.amenities.slice(0, 8)).map((amenity) => (
                      <div key={amenity.id} className="flex items-center gap-3 text-gray-700">
                        <Wifi className="w-5 h-5 text-teal-600" />
                        <span>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                  {viewingProperty.amenities.length > 8 && (
                    <button
                      onClick={() => setShowAllAmenities(!showAllAmenities)}
                      className="mt-4 px-6 py-2 border border-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {showAllAmenities ? 'Show less amenities' : `Show all ${viewingProperty.amenities.length} amenities`}
                    </button>
                  )}
                </div>
              )}

              {/* Property Type */}
              {viewingProperty.type && (
                <div className="pb-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Property Type</h2>
                  <p className="text-gray-700">{viewingProperty.type.type}</p>
                </div>
              )}

              {/* Status */}
              <div className="pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Status</h2>
                <div>{getStatusBadge(viewingProperty.status)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

