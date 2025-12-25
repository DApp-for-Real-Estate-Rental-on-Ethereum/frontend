"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, MapPin, CheckCircle, XCircle, Ban, RotateCcw, Eye, Search, ChevronLeft, ChevronRight, X } from "lucide-react"
import Image from "next/image"
import type { Property, PropertyStatus } from "@/lib/types"
import { Pagination } from "@/components/ui/pagination"

interface PropertiesManagementProps {
  filter: "all-properties" | "pending-approval" | "approved" | "suspended" | "disapproved"
}

export function PropertiesManagement({ filter }: PropertiesManagementProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [suspendReason, setSuspendReason] = useState("")
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0)
  const [hostInfo, setHostInfo] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    phoneNumber?: number
    profilePicture?: string
    walletAddress?: string
    score?: number
    rating?: number
    enabled?: boolean
    roles?: string[]
    birthday?: string
  } | null>(null)
  const [loadingHostInfo, setLoadingHostInfo] = useState(false)

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    filterProperties()
    setCurrentPage(1) // Reset to first page when filter or search changes
  }, [properties, filter, searchQuery])

  // Fetch host information when viewing property
  useEffect(() => {
    const fetchHostInfo = async () => {
      if (!viewDialogOpen || !selectedProperty?.userId) {
        setHostInfo(null)
        return
      }

      setLoadingHostInfo(true)
      try {
        const userId = typeof selectedProperty.userId === 'string'
          ? parseInt(selectedProperty.userId)
          : selectedProperty.userId

        if (isNaN(userId)) {
          setHostInfo(null)
          return
        }

        const userInfo = await apiClient.users.getById(userId)
        setHostInfo({
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          phoneNumber: userInfo.phoneNumber,
          profilePicture: userInfo.profilePicture,
          walletAddress: userInfo.walletAddress,
          score: userInfo.score,
          rating: userInfo.rating,
          enabled: userInfo.enabled,
          roles: userInfo.roles,
          birthday: userInfo.birthday,
        })
      } catch (err) {
        setHostInfo(null)
      } finally {
        setLoadingHostInfo(false)
      }
    }

    fetchHostInfo()
  }, [viewDialogOpen, selectedProperty?.userId])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen || !selectedProperty?.propertyImages || selectedProperty.propertyImages.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setLightboxImageIndex((prev) =>
          prev === 0 ? selectedProperty.propertyImages!.length - 1 : prev - 1
        )
      } else if (e.key === 'ArrowRight') {
        setLightboxImageIndex((prev) =>
          prev === selectedProperty.propertyImages!.length - 1 ? 0 : prev + 1
        )
      } else if (e.key === 'Escape') {
        setLightboxOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, selectedProperty?.propertyImages?.length])

  const fetchProperties = async () => {
    try {
      setIsLoading(true)
      setError("")
      // Get all properties with all statuses for admin
      const data = await apiClient.properties.getAllForAdmin()

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

    // Filter by status - using exact enum values from backend
    if (filter === "pending-approval") {
      filtered = filtered.filter((p) => p.status === "PENDING_APPROVAL")
    } else if (filter === "approved") {
      filtered = filtered.filter((p) => p.status === "APPROVED")
    } else if (filter === "suspended") {
      filtered = filtered.filter((p) => p.status === "SUSPENDED")
    } else if (filter === "disapproved") {
      filtered = filtered.filter((p) => p.status === "DISAPPROVED")
    }
    // "all-properties" shows all statuses

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.address?.city?.toLowerCase().includes(query) ||
          p.address?.address?.toLowerCase().includes(query) ||
          p.type?.type?.toLowerCase().includes(query)
      )
    }


    setFilteredProperties(filtered)
  }

  const getStatusBadge = (status: PropertyStatus) => {
    const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
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

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const handleApprove = async (propertyId: string) => {
    setActionLoading((prev) => ({ ...prev, [propertyId]: true }))
    setError("")

    try {
      await apiClient.properties.approve(propertyId, true)
      await fetchProperties()
      setApproveDialogOpen(false)
      setSelectedProperty(null)
    } catch (err: any) {
      setError(err.message || "Failed to approve property")
    } finally {
      setActionLoading((prev) => ({ ...prev, [propertyId]: false }))
    }
  }

  const handleReject = async (propertyId: string) => {
    setActionLoading((prev) => ({ ...prev, [propertyId]: true }))
    setError("")

    try {
      await apiClient.properties.approve(propertyId, false)
      await fetchProperties()
      setRejectDialogOpen(false)
      setSelectedProperty(null)
    } catch (err: any) {
      setError(err.message || "Failed to reject property")
    } finally {
      setActionLoading((prev) => ({ ...prev, [propertyId]: false }))
    }
  }

  const handleSuspend = async () => {
    if (!selectedProperty || !suspendReason.trim()) {
      setError("Please provide a reason for suspension")
      return
    }

    setActionLoading((prev) => ({ ...prev, [selectedProperty.id]: true }))
    setError("")

    try {
      await apiClient.properties.suspend(selectedProperty.id, suspendReason)
      await fetchProperties()
      setSuspendDialogOpen(false)
      setSelectedProperty(null)
      setSuspendReason("")
    } catch (err: any) {
      setError(err.message || "Failed to suspend property")
    } finally {
      setActionLoading((prev) => ({ ...prev, [selectedProperty.id]: false }))
    }
  }

  const handleRevokeSuspension = async (propertyId: string) => {
    setActionLoading((prev) => ({ ...prev, [propertyId]: true }))
    setError("")

    try {
      await apiClient.properties.revokeSuspension(propertyId)
      await fetchProperties()
      setRevokeDialogOpen(false)
      setSelectedProperty(null)
    } catch (err: any) {
      setError(err.message || "Failed to revoke suspension")
    } finally {
      setActionLoading((prev) => ({ ...prev, [propertyId]: false }))
    }
  }

  const getPropertyImage = (property: Property) => {
    if (!property.propertyImages || property.propertyImages.length === 0) {
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
    // Property images are stored in property-service (port 8081)
    if (url.startsWith("/uploads")) {
      return `http://localhost:8081${url}`
    }
    // Profile pictures are stored in user-service (port 8082)
    if (url.startsWith("/profile-pictures") || url.startsWith("/user-images")) {
      return `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"}${url}`
    }
    // If it's a relative path starting with /, assume it's from user-service
    if (url.startsWith("/") && !url.startsWith("/uploads")) {
      return `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"}${url}`
    }
    return url
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchProperties} variant="outline">
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by title, description, location, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"}
        </div>
      </div>

      {/* Properties Table */}
      {filteredProperties.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 text-lg">
            {searchQuery ? "No properties found matching your search." : "No properties found."}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((property) => {
                    const imageUrl = getPropertyImage(property)
                    const isLoading = actionLoading[property.id]

                    return (
                      <TableRow key={property.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden">
                            {imageUrl ? (
                              <Image
                                src={getImageUrl(imageUrl)}
                                alt={property.title}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/houses_placeholder.png"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-semibold text-gray-900 truncate">{property.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                              {property.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {property.address?.city}, {property.address?.address}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {property.type?.type || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-teal-600">
                              {property.dailyPrice?.toFixed(4) || property.price?.toFixed(4) || "N/A"} ETH/day
                            </span>
                            {property.depositAmount && property.depositAmount > 0 && (
                              <span className="text-xs font-semibold text-orange-600">
                                Deposit: {property.depositAmount.toFixed(4)} ETH
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            <div>{property.capacity} guests</div>
                            {property.numberOfBedrooms && (
                              <div className="text-xs text-gray-500">
                                {property.numberOfBedrooms} bedrooms
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(property.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProperty(property)
                                setViewDialogOpen(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {property.status === "PENDING_APPROVAL" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProperty(property)
                                    setApproveDialogOpen(true)
                                  }}
                                  disabled={isLoading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProperty(property)
                                    setRejectDialogOpen(true)
                                  }}
                                  disabled={isLoading}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}

                            {property.status === "DISAPPROVED" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedProperty(property)
                                  setApproveDialogOpen(true)
                                }}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                                title="Approve Property"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                            {(property.status === "APPROVED" || filter === "approved") && property.status === "APPROVED" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedProperty(property)
                                  setSuspendDialogOpen(true)
                                }}
                                disabled={isLoading}
                                className="bg-orange-600 hover:bg-orange-700"
                                title="Suspend Property"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                            {property.status === "SUSPENDED" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedProperty(property)
                                  setRevokeDialogOpen(true)
                                }}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
          {filteredProperties.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredProperties.length / itemsPerPage)}
              totalItems={filteredProperties.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage)
                setCurrentPage(1)
              }}
            />
          )}
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{selectedProperty?.title}"? This will make it visible to all users.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedProperty && handleApprove(selectedProperty.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject "{selectedProperty?.title}"? This will mark it as disapproved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedProperty && handleReject(selectedProperty.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Property</DialogTitle>
            <DialogDescription>
              Please provide a reason for suspending "{selectedProperty?.title}".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for suspension..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            className="mt-4"
            rows={4}
          />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => {
              setSuspendDialogOpen(false)
              setSuspendReason("")
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={!suspendReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Suspend
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Suspension Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Suspension</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the suspension for "{selectedProperty?.title}"? This will restore it to approved status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedProperty && handleRevokeSuspension(selectedProperty.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              Revoke Suspension
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Property Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              {/* All Property Images */}
              {selectedProperty.propertyImages && selectedProperty.propertyImages.length > 0 ? (
                <div>
                  <h4 className="font-semibold mb-3">Images ({selectedProperty.propertyImages.length})</h4>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedProperty.propertyImages.map((image, index) => (
                      <div
                        key={image.id || index}
                        className="relative h-32 bg-gray-200 rounded-lg overflow-hidden cursor-pointer group hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setLightboxImageIndex(index)
                          setLightboxOpen(true)
                        }}
                      >
                        <Image
                          src={getImageUrl(image.url)}
                          alt={`${selectedProperty.title} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 25vw"
                        />
                        {image.cover && (
                          <div className="absolute top-2 left-2 bg-teal-600 text-white text-xs px-2 py-1 rounded">
                            Cover
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative h-64 w-full bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                  <div className="text-gray-400">No Images Available</div>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Status</h4>
                {getStatusBadge(selectedProperty.status)}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-600">{selectedProperty.description}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Location</h4>
                <p className="text-gray-600">
                  {selectedProperty.address?.address}, {selectedProperty.address?.city}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Price</h4>
                  <p className="text-gray-600">{selectedProperty.dailyPrice || selectedProperty.price} ETH/day</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Capacity</h4>
                  <p className="text-gray-600">{selectedProperty.capacity} guests</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Bedrooms</h4>
                  <p className="text-gray-600">{selectedProperty.numberOfBedrooms || "N/A"}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Type</h4>
                  <p className="text-gray-600">{selectedProperty.type?.type || "N/A"}</p>
                </div>
              </div>

              {/* Host Information */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-3">Host Information</h4>
                {loadingHostInfo ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading host information...</span>
                  </div>
                ) : hostInfo ? (
                  <div className="space-y-4">
                    {/* Profile Picture */}
                    {hostInfo.profilePicture && (
                      <div className="mb-4 flex justify-center">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-teal-200">
                          <Image
                            src={getImageUrl(hostInfo.profilePicture)}
                            alt={`${hostInfo.firstName} ${hostInfo.lastName}`}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-500 mb-1">Full Name</h5>
                        <p className="text-gray-900 font-semibold">
                          {hostInfo.firstName} {hostInfo.lastName}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-500 mb-1">Email</h5>
                        <p className="text-gray-900">{hostInfo.email || "N/A"}</p>
                      </div>
                      {hostInfo.phoneNumber && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h5>
                          <p className="text-gray-900">{hostInfo.phoneNumber}</p>
                        </div>
                      )}
                      {hostInfo.birthday && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-1">Birthday</h5>
                          <p className="text-gray-900">
                            {new Date(hostInfo.birthday).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Score and Rating */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      {hostInfo.score !== undefined && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-1">Score</h5>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-teal-600">{hostInfo.score}</span>
                            <span className="text-xs text-gray-500">/ 100</span>
                          </div>
                        </div>
                      )}
                      {hostInfo.rating !== undefined && hostInfo.rating !== null && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-1">Rating</h5>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-yellow-600">{hostInfo.rating.toFixed(1)}</span>
                            <span className="text-xs text-gray-500">/ 5.0</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wallet Address */}
                    {hostInfo.walletAddress && (
                      <div className="pt-2 border-t">
                        <h5 className="text-sm font-medium text-gray-500 mb-1">Wallet Address</h5>
                        <p className="text-gray-900 font-mono text-xs break-all">
                          {hostInfo.walletAddress}
                        </p>
                      </div>
                    )}

                    {/* Roles */}
                    {hostInfo.roles && hostInfo.roles.length > 0 && (
                      <div className="pt-2 border-t">
                        <h5 className="text-sm font-medium text-gray-500 mb-2">Roles</h5>
                        <div className="flex flex-wrap gap-2">
                          {hostInfo.roles.map((role, index) => (
                            <Badge
                              key={index}
                              className={
                                role === "ADMIN"
                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                  : role === "POSTER" || role === "HOST"
                                    ? "bg-teal-100 text-teal-800 border-teal-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Account Status */}
                    {hostInfo.enabled !== undefined && (
                      <div className="pt-2 border-t">
                        <h5 className="text-sm font-medium text-gray-500 mb-2">Account Status</h5>
                        <Badge
                          className={
                            hostInfo.enabled
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {hostInfo.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Host information not available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      {lightboxOpen && selectedProperty && selectedProperty.propertyImages && selectedProperty.propertyImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous Button */}
          {selectedProperty.propertyImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxImageIndex((prev) =>
                  prev === 0 ? selectedProperty.propertyImages!.length - 1 : prev - 1
                )
              }}
              className="absolute left-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-7xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getImageUrl(selectedProperty.propertyImages[lightboxImageIndex]?.url)}
              alt={`${selectedProperty.title} - Image ${lightboxImageIndex + 1}`}
              width={1200}
              height={800}
              className="object-contain max-h-[90vh] w-auto"
              sizes="90vw"
            />

            {/* Image Counter */}
            {selectedProperty.propertyImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
                {lightboxImageIndex + 1} / {selectedProperty.propertyImages.length}
              </div>
            )}
          </div>

          {/* Next Button */}
          {selectedProperty.propertyImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxImageIndex((prev) =>
                  prev === selectedProperty.propertyImages!.length - 1 ? 0 : prev + 1
                )
              }}
              className="absolute right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

