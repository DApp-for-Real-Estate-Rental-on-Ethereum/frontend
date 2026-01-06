"use client"

import { useState, useEffect } from "react"
import { apiClient, GATEWAY_URL } from "@/lib/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, AlertTriangle, Eye, Trash2, Phone, MapPin, Building2, Edit2, X, Upload, Image as ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"

// Use GATEWAY_URL for file access (comes from environment variables at build time)
const RECLAMATION_API_BASE_URL = GATEWAY_URL

interface HostReclamationsProps {
  ownerId: string | number
  filter: "my-complaints" | "complaints-against-me"
}

interface ImagePreview {
  file?: File
  preview: string
  url?: string
}

export function HostReclamations({ ownerId, filter }: HostReclamationsProps) {
  const router = useRouter()
  const [reclamations, setReclamations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})
  const [properties, setProperties] = useState<{ [key: number]: any }>({})
  const [phoneNumbers, setPhoneNumbers] = useState<{ [key: number]: string | null }>({})
  const [loadingData, setLoadingData] = useState<{ [key: number]: boolean }>({})
  const [attachments, setAttachments] = useState<{ [key: number]: any[] }>({})

  // View/Edit Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedReclamation, setSelectedReclamation] = useState<any | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImages, setEditImages] = useState<ImagePreview[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchReclamations()
  }, [ownerId, filter])

  const fetchReclamations = async () => {
    setIsLoading(true)
    setError("")
    try {
      let data: any[] = []
      if (filter === "my-complaints") {
        data = await apiClient.reclamations.getMyComplaints(ownerId)
      } else {
        data = await apiClient.reclamations.getComplaintsAgainstMe(ownerId)
      }
      setReclamations(data || [])

      // Fetch property and phone number data for each reclamation
      if (data && data.length > 0) {
        await fetchReclamationDetails(data)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch reclamations")
      toast.error("Failed to load reclamations")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReclamationDetails = async (reclamations: any[]) => {
    try {
      const propertiesMap: { [key: number]: any } = {}
      const phoneNumbersMap: { [key: number]: string | null } = {}

      await Promise.all(
        reclamations.map(async (complaint) => {
          try {
            setLoadingData((prev) => ({ ...prev, [complaint.id]: true }))

            // Fetch booking to get propertyId
            try {
              const booking = await apiClient.bookings.getById(complaint.bookingId)
              if (booking && booking.propertyId) {
                // Fetch property details
                try {
                  const property = await apiClient.properties.getById(String(booking.propertyId))
                  propertiesMap[complaint.id] = property
                } catch (err) {
                }

                // Fetch phone number - for complaints against me, get complainant phone
                if (filter === "complaints-against-me") {
                  try {
                    const phone = await apiClient.reclamations.getUserPhoneNumber(complaint.complainantId)
                    phoneNumbersMap[complaint.id] = phone
                  } catch (err) {
                  }
                }
              }
            } catch (err) {
            }
          } catch (err) {
          } finally {
            setLoadingData((prev) => ({ ...prev, [complaint.id]: false }))
          }
        })
      )

      setProperties((prev) => ({ ...prev, ...propertiesMap }))
      setPhoneNumbers((prev) => ({ ...prev, ...phoneNumbersMap }))
    } catch (err) {
    }
  }

  const fetchAttachments = async (reclamationId: number) => {
    setLoadingAttachments(true)
    try {
      // Use regular reclamations endpoint instead of admin endpoint
      const atts = await apiClient.reclamations.getAttachments(reclamationId)
      setAttachments((prev) => ({ ...prev, [reclamationId]: atts || [] }))
      return atts || []
    } catch (err: any) {
      // Try admin endpoint as fallback
      try {
        const atts = await apiClient.adminReclamations.getAttachments(reclamationId)
        setAttachments((prev) => ({ ...prev, [reclamationId]: atts || [] }))
        return atts || []
      } catch (adminErr: any) {
        return []
      }
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handleView = async (reclamation: any) => {
    setSelectedReclamation(reclamation)
    setViewDialogOpen(true)
    await fetchAttachments(reclamation.id)
  }

  const handleEdit = async (reclamation: any) => {
    setSelectedReclamation(reclamation)
    setEditTitle(reclamation.title)
    setEditDescription(reclamation.description)
    setEditImages([])
    setEditDialogOpen(true)
    const atts = await fetchAttachments(reclamation.id)
    // Load existing images as previews
    const existingImages: ImagePreview[] = (atts || []).map((att: any) => {
      // Build filename from filePath
      let filename = att.filePath
      if (att.filePath.includes('/')) {
        filename = att.filePath.split('/').pop() || att.filePath
      }
      filename = filename.replace(/\\/g, '/').split('/').pop() || filename

      // Use regular endpoint for images
      const imageUrl = `${RECLAMATION_API_BASE_URL}/api/reclamations/files/${reclamation.id}/${encodeURIComponent(filename)}`
      console.log("📸 Edit dialog - Image URL:", imageUrl, "from filePath:", att.filePath)
      return { preview: imageUrl, url: imageUrl }
    })
    setEditImages(existingImages)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: ImagePreview[] = []
    for (let i = 0; i < files.length && editImages.length + newImages.length < 3; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setEditImages((prev) => [...prev, { file, preview: e.target?.result as string }])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const removeImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdate = async () => {
    if (!selectedReclamation) return

    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error("Title and description are required")
      return
    }

    setUpdating(true)
    try {
      // Check if images were modified (new files added or images removed)
      const existingImageCount = editImages.filter(img => !img.file && img.url).length
      const newImageFiles = editImages.filter(img => img.file).map(img => img.file!)
      const totalImages = existingImageCount + newImageFiles.length

      // If total images exceed 3, show error
      if (totalImages > 3) {
        toast.error("Maximum 3 images allowed")
        setUpdating(false)
        return
      }

      // If user removed all images or added new ones, send all images (new files only)
      // Backend will replace all old images with new ones
      const imagesToSend = newImageFiles.length > 0 ? newImageFiles : undefined

      await apiClient.reclamations.update(
        selectedReclamation.id,
        ownerId,
        editTitle.trim(),
        editDescription.trim(),
        imagesToSend
      )

      toast.success("Reclamation updated successfully")
      setEditDialogOpen(false)
      await fetchReclamations()
    } catch (err: any) {
      toast.error(err.message || "Failed to update reclamation")
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveReclamation = async (reclamationId: number) => {
    if (!window.confirm("Are you sure you want to remove this reclamation?")) {
      return
    }

    setActionLoading((prev) => ({ ...prev, [reclamationId]: true }))
    try {
      await apiClient.reclamations.delete(reclamationId, ownerId)
      setReclamations((prev) => prev.filter((r) => r.id !== reclamationId))
      toast.success("Reclamation removed successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to remove reclamation")
    } finally {
      setActionLoading((prev) => ({ ...prev, [reclamationId]: false }))
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: "bg-blue-100 text-blue-800",
      IN_REVIEW: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={`${colors[status] || "bg-gray-100 text-gray-800"} backdrop-blur-sm border border-current/20`}>
        {status.replace("_", " ")}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      LOW: "bg-green-100 text-green-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-orange-100 text-orange-800",
      CRITICAL: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={`${colors[severity] || "bg-gray-100 text-gray-800"} backdrop-blur-sm border border-current/20`}>
        {severity}
      </Badge>
    )
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ACCESS_ISSUE: "Access Issue",
      NOT_AS_DESCRIBED: "Not As Described",
      CLEANLINESS: "Cleanliness",
      SAFETY_HEALTH: "Safety & Health",
      PROPERTY_DAMAGE: "Property Damage",
      EXTRA_CLEANING: "Extra Cleaning",
      HOUSE_RULE_VIOLATION: "House Rule Violation",
      UNAUTHORIZED_GUESTS_OR_STAY: "Unauthorized Guests/Stay",
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading reclamations...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-700">{error}</p>
      </Card>
    )
  }

  if (reclamations.length === 0) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {filter === "my-complaints" ? "No complaints filed" : "No complaints against you"}
        </h2>
        <p className="text-gray-600">
          {filter === "my-complaints"
            ? "You haven't filed any complaints yet."
            : "You don't have any complaints filed against you."}
        </p>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reclamations.map((complaint) => {
          const property = properties[complaint.id]
          const phoneNumber = phoneNumbers[complaint.id]
          const isLoadingDetails = loadingData[complaint.id]

          // Debug: Log complaint data for my-complaints
          if (filter === "my-complaints") {
            console.log("🔍 Reclamation Debug:", {
              id: complaint.id,
              status: complaint.status,
              statusType: typeof complaint.status,
              filter: filter,
              canEdit: filter === "my-complaints" && complaint.status === "OPEN",
              statusCheck: complaint.status === "OPEN",
              statusValue: JSON.stringify(complaint.status)
            })
          }

          return (
            <Card key={complaint.id} className="p-6 hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl group">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">{complaint.title}</h3>
                  </div>
                  {/* Status and Severity - Only for my-complaints */}
                  {filter === "my-complaints" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(complaint.status)}
                      {getSeverityBadge(complaint.severity)}
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-4 text-sm line-clamp-3 flex-1">{complaint.description}</p>

                {/* Property Info - Only for my-complaints */}
                {filter === "my-complaints" && property && (
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

                {/* Phone Number - Only for complaints-against-me */}
                {filter === "complaints-against-me" && phoneNumber && (
                  <div className="mb-4 p-3 bg-teal-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-teal-600" />
                      <span className="text-gray-600">Complainant Phone:</span>
                      <span className="font-semibold text-gray-900">{phoneNumber}</span>
                    </div>
                  </div>
                )}

                {/* Type - Only for my-complaints */}
                {filter === "my-complaints" && (
                  <div className="mb-4">
                    <span className="text-xs text-gray-500">Type: </span>
                    <span className="text-xs font-medium text-gray-700">{getTypeLabel(complaint.type)}</span>
                  </div>
                )}

                {/* Refund and Penalty - Only for my-complaints */}
                {filter === "my-complaints" && (
                  <div className="mb-4 space-y-1">
                    {complaint.refundAmount && (
                      <div className="text-sm font-semibold text-green-600">
                        Refund: {complaint.refundAmount.toFixed(2)} MAD
                      </div>
                    )}
                    {complaint.penaltyPoints && (
                      <div className="text-sm font-semibold text-red-600">
                        Penalty: {complaint.penaltyPoints} pts
                      </div>
                    )}
                  </div>
                )}

                {/* Resolution Notes - Only for my-complaints */}
                {filter === "my-complaints" && complaint.resolutionNotes && (
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

                    onClick={() => handleView(complaint)}
                    className="flex-1 hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {(() => {
                    // Check if we're in my-complaints filter
                    const isMyComplaints = filter === "my-complaints"

                    // Get status value - handle both string and object
                    let statusValue = complaint.status
                    if (typeof statusValue === "object" && statusValue !== null) {
                      statusValue = (statusValue as any).name || (statusValue as any).value || String(statusValue)
                    }
                    statusValue = String(statusValue || "").trim().toUpperCase()

                    // Check if status is OPEN
                    const isOpen = statusValue === "OPEN"

                    // Log for debugging
                    if (isMyComplaints) {
                      console.log("🔧 Edit Button Logic:", {
                        id: complaint.id,
                        isMyComplaints: isMyComplaints,
                        originalStatus: complaint.status,
                        statusValue: statusValue,
                        isOpen: isOpen,
                        willShowEdit: isMyComplaints && isOpen
                      })
                    }

                    // Show edit buttons only if: my-complaints AND status is OPEN
                    if (isMyComplaints && isOpen) {
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(complaint)}
                            title="Edit reclamation"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveReclamation(complaint.id)}
                            disabled={actionLoading[complaint.id]}
                          >
                            {actionLoading[complaint.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )
                    } else if (isMyComplaints) {
                      return (
                        <div className="text-xs text-gray-500 italic px-2 py-1 bg-gray-50 rounded">
                          Cannot edit (Status: {statusValue})
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Reclamation Details</DialogTitle>
            <DialogDescription>
              {filter === "my-complaints" ? "View your reclamation" : "View reclamation against you"}
            </DialogDescription>
          </DialogHeader>

          {selectedReclamation && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Title</Label>
                <p className="text-sm text-gray-900 mt-1">{selectedReclamation.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{selectedReclamation.description}</p>
              </div>

              {/* Images */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Attachments</Label>
                {loadingAttachments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading images...</span>
                  </div>
                ) : attachments[selectedReclamation.id]?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {attachments[selectedReclamation.id].map((attachment: any, index: number) => {
                      // Build image URL from filePath
                      // filePath format: "reclamationId/filename" (e.g., "4/8c2f0278-d8d5-45d7-bee6-606f82cb0347.png")
                      let filename = attachment.filePath
                      if (attachment.filePath.includes('/')) {
                        // Extract filename from path like "4/filename.png"
                        filename = attachment.filePath.split('/').pop() || attachment.filePath
                      }
                      // Remove any backslashes (Windows paths)
                      filename = filename.replace(/\\/g, '/').split('/').pop() || filename

                      // Try regular endpoint first, fallback to admin endpoint
                      const imageUrl = `${RECLAMATION_API_BASE_URL}/api/reclamations/files/${selectedReclamation.id}/${encodeURIComponent(filename)}`
                      console.log("🖼️ Image URL:", imageUrl, "from filePath:", attachment.filePath, "filename:", filename)

                      return (
                        <div key={attachment.id || index} className="relative">
                          <img
                            src={imageUrl}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              console.error("❌ Failed to load image:", imageUrl, "from filePath:", attachment.filePath)
                              // Try admin endpoint as fallback
                              const adminUrl = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/files/${selectedReclamation.id}/${encodeURIComponent(filename)}`
                              if (target.src !== adminUrl) {
                                target.src = adminUrl
                              } else {
                                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E"
                              }
                            }}
                            onLoad={() => {
                              console.log("✅ Image loaded successfully:", imageUrl)
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No images attached</p>
                )}
              </div>

              {/* Phone Number - Only for complaints-against-me */}
              {filter === "complaints-against-me" && phoneNumbers[selectedReclamation.id] && (
                <div className="p-3 bg-teal-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-gray-600">Complainant Phone:</span>
                    <span className="text-sm font-semibold text-gray-900">{phoneNumbers[selectedReclamation.id]}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Edit Reclamation</DialogTitle>
            <DialogDescription>
              Update title, description, and images. Only OPEN reclamations can be edited.
            </DialogDescription>
          </DialogHeader>

          {selectedReclamation && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter reclamation title"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter reclamation description"
                  rows={5}
                />
              </div>

              {/* Images */}
              <div>
                <Label>Images (Max 3)</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {editImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editImages.length < 3 && (
                    <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">Add Image</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updating || !editTitle.trim() || !editDescription.trim()}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
