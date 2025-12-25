"use client"

import { useState, useEffect } from "react"
import { apiClient, GATEWAY_URL } from "@/lib/services/api"

// Use GATEWAY_URL for file access (comes from environment variables at build time)
const RECLAMATION_API_BASE_URL = GATEWAY_URL
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Eye,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  User,
  Building2,
  DollarSign,
  Filter,
  Info,
  Image as ImageIcon,
  X
} from "lucide-react"
import { toast } from "sonner"

interface ReclamationsManagementProps {
  filter: "all-reclamations" | "open-reclamations" | "in-review-reclamations" | "resolved-reclamations" | "rejected-reclamations"
}

interface Reclamation {
  id: number
  bookingId: number
  complainantId: number
  complainantRole: "GUEST" | "HOST"
  targetUserId: number
  type: string
  title?: string
  description?: string
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  refundAmount?: number
  penaltyPoints?: number
  resolutionNotes?: string
  createdAt: string
  updatedAt?: string
  resolvedAt?: string
}

export function ReclamationsManagement({ filter }: ReclamationsManagementProps) {
  const [reclamations, setReclamations] = useState<Reclamation[]>([])
  const [filteredReclamations, setFilteredReclamations] = useState<Reclamation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  // Additional filters
  const [filterByRole, setFilterByRole] = useState<"ALL" | "GUEST" | "HOST">("ALL")
  const [filterBySeverity, setFilterBySeverity] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("ALL")
  const [filterByType, setFilterByType] = useState<string>("ALL")
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [severityDialogOpen, setSeverityDialogOpen] = useState(false)
  const [selectedReclamation, setSelectedReclamation] = useState<Reclamation | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [rejectionNotes, setRejectionNotes] = useState("")
  const [selectedSeverity, setSelectedSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("LOW")
  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  useEffect(() => {
    fetchReclamations()
  }, [filter])

  useEffect(() => {
    filterReclamations()
  }, [reclamations, searchQuery, filter, filterByRole, filterBySeverity, filterByType])

  const fetchReclamations = async () => {
    try {
      setIsLoading(true)
      setError("")

      let data: Reclamation[] = []

      if (filter === "open-reclamations") {
        data = await apiClient.adminReclamations.getByStatus("OPEN")
      } else if (filter === "in-review-reclamations") {
        data = await apiClient.adminReclamations.getByStatus("IN_REVIEW")
      } else if (filter === "resolved-reclamations") {
        data = await apiClient.adminReclamations.getByStatus("RESOLVED")
      } else if (filter === "rejected-reclamations") {
        data = await apiClient.adminReclamations.getByStatus("REJECTED")
      } else {
        data = await apiClient.adminReclamations.getAll()
      }

      setReclamations(data)
    } catch (err: any) {
      setError(err.message || "Failed to fetch reclamations")
      toast.error("Failed to load reclamations")
    } finally {
      setIsLoading(false)
    }
  }


  const filterReclamations = () => {
    let filtered = [...reclamations]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.id.toString().includes(searchQuery) ||
          r.bookingId.toString().includes(searchQuery) ||
          r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Role filter
    if (filterByRole !== "ALL") {
      filtered = filtered.filter((r) => r.complainantRole === filterByRole)
    }

    // Severity filter
    if (filterBySeverity !== "ALL") {
      filtered = filtered.filter((r) => r.severity === filterBySeverity)
    }

    // Type filter
    if (filterByType !== "ALL") {
      filtered = filtered.filter((r) => r.type === filterByType)
    }

    setFilteredReclamations(filtered)
    setCurrentPage(1)
  }

  const handleView = async (reclamation: Reclamation) => {
    setSelectedReclamation(reclamation)
    setViewDialogOpen(true)
    // Load attachments
    setLoadingAttachments(true)
    setAttachments([]) // Clear previous attachments
    try {
      console.log("📸 Loading attachments for reclamation:", reclamation.id)
      const atts = await apiClient.adminReclamations.getAttachments(reclamation.id)
      console.log("📸 Attachments loaded:", atts)
      setAttachments(atts || [])
    } catch (err: any) {
      console.error("❌ Failed to load attachments:", err)
      toast.error("Failed to load images: " + (err.message || "Unknown error"))
      setAttachments([])
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handleReview = async (reclamationId: number) => {
    try {
      setActionLoading({ ...actionLoading, [`review-${reclamationId}`]: true })
      await apiClient.adminReclamations.review(reclamationId)
      toast.success("Reclamation moved to review")
      await fetchReclamations()
    } catch (err: any) {
      toast.error(err.message || "Failed to review reclamation")
    } finally {
      setActionLoading({ ...actionLoading, [`review-${reclamationId}`]: false })
    }
  }

  const handleUpdateSeverity = async () => {
    if (!selectedReclamation) return

    try {
      setActionLoading({ ...actionLoading, [`severity-${selectedReclamation.id}`]: true })
      await apiClient.adminReclamations.updateSeverity(selectedReclamation.id, selectedSeverity)
      toast.success("Severity updated successfully")
      setSeverityDialogOpen(false)
      await fetchReclamations()
    } catch (err: any) {
      toast.error(err.message || "Failed to update severity")
    } finally {
      setActionLoading({ ...actionLoading, [`severity-${selectedReclamation.id}`]: false })
    }
  }

  const handleResolve = async (approved: boolean) => {
    if (!selectedReclamation) return

    try {
      setActionLoading({ ...actionLoading, [`resolve-${selectedReclamation.id}`]: true })
      await apiClient.adminReclamations.resolve(
        selectedReclamation.id,
        resolutionNotes,
        approved
      )
      toast.success(approved ? "Reclamation resolved successfully" : "Reclamation rejected")
      setResolveDialogOpen(false)
      setResolutionNotes("")
      await fetchReclamations()
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve reclamation")
    } finally {
      setActionLoading({ ...actionLoading, [`resolve-${selectedReclamation.id}`]: false })
    }
  }

  const handleReject = async () => {
    if (!selectedReclamation) return

    try {
      setActionLoading({ ...actionLoading, [`reject-${selectedReclamation.id}`]: true })
      await apiClient.adminReclamations.reject(selectedReclamation.id, rejectionNotes)
      toast.success("Reclamation rejected")
      setRejectDialogOpen(false)
      setRejectionNotes("")
      await fetchReclamations()
    } catch (err: any) {
      toast.error(err.message || "Failed to reject reclamation")
    } finally {
      setActionLoading({ ...actionLoading, [`reject-${selectedReclamation.id}`]: false })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      OPEN: "default",
      IN_REVIEW: "secondary",
      RESOLVED: "outline",
      REJECTED: "destructive",
    }

    const colors: Record<string, string> = {
      OPEN: "bg-blue-100 text-blue-800",
      IN_REVIEW: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
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
      <Badge className={colors[severity] || "bg-gray-100 text-gray-800"}>
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

  // Calculate expected penalty based on type and severity
  const calculateExpectedPenalty = (
    type: string,
    severity: string,
    role: "GUEST" | "HOST",
    totalRent?: number,
    totalDeposit?: number
  ): { refund: number; penaltyPoints: number } => {
    // Guest complaints
    if (role === "GUEST") {
      switch (type) {
        case "ACCESS_ISSUE":
        case "NOT_AS_DESCRIBED":
          // Full refund: Rent (minus 10% platform fee) + Deposit (full)
          // Platform fee is deducted from rent only, not from deposit
          const rentAfterFee = (totalRent || 0) * 0.90; // 90% of rent (10% platform fee)
          return { refund: rentAfterFee + (totalDeposit || 0), penaltyPoints: 10 }
        case "CLEANLINESS":
          // Calculate refund percentage, then deduct 10% platform fee
          const cleanlinessRefundBeforeFee = {
            LOW: (totalRent || 0) * 0.05,
            MEDIUM: (totalRent || 0) * 0.125,
            HIGH: (totalRent || 0) * 0.325,
            CRITICAL: (totalRent || 0) * 0.50,
          }
          const cleanlinessRefund = {
            LOW: cleanlinessRefundBeforeFee.LOW * 0.90, // 90% after platform fee
            MEDIUM: cleanlinessRefundBeforeFee.MEDIUM * 0.90,
            HIGH: cleanlinessRefundBeforeFee.HIGH * 0.90,
            CRITICAL: cleanlinessRefundBeforeFee.CRITICAL * 0.90,
          }
          const cleanlinessPoints = {
            LOW: 0,
            MEDIUM: 2,
            HIGH: 5,
            CRITICAL: 10,
          }
          return {
            refund: cleanlinessRefund[severity as keyof typeof cleanlinessRefund] || 0,
            penaltyPoints: cleanlinessPoints[severity as keyof typeof cleanlinessPoints] || 0,
          }
        case "SAFETY_HEALTH":
          // Calculate refund percentage, then deduct 10% platform fee
          const safetyRefundBeforeFee = {
            LOW: (totalRent || 0) * 0.10,
            MEDIUM: (totalRent || 0) * 0.30,
            HIGH: (totalRent || 0) * 0.70,
            CRITICAL: totalRent || 0,
          }
          const safetyRefund = {
            LOW: safetyRefundBeforeFee.LOW * 0.90, // 90% after platform fee
            MEDIUM: safetyRefundBeforeFee.MEDIUM * 0.90,
            HIGH: safetyRefundBeforeFee.HIGH * 0.90,
            CRITICAL: safetyRefundBeforeFee.CRITICAL * 0.90,
          }
          const safetyPoints = {
            LOW: 3,
            MEDIUM: 7,
            HIGH: 15,
            CRITICAL: 25,
          }
          return {
            refund: safetyRefund[severity as keyof typeof safetyRefund] || 0,
            penaltyPoints: safetyPoints[severity as keyof typeof safetyPoints] || 0,
          }
        default:
          return { refund: 0, penaltyPoints: 0 }
      }
    }
    // Host complaints
    else {
      switch (type) {
        case "PROPERTY_DAMAGE":
          const damageRefund = {
            LOW: (totalDeposit || 0) * 0.075,
            MEDIUM: (totalDeposit || 0) * 0.30,
            HIGH: (totalDeposit || 0) * 0.70,
            CRITICAL: totalDeposit || 0,
          }
          const damagePoints = {
            LOW: 2,
            MEDIUM: 5,
            HIGH: 10,
            CRITICAL: 15,
          }
          return {
            refund: damageRefund[severity as keyof typeof damageRefund] || 0,
            penaltyPoints: damagePoints[severity as keyof typeof damagePoints] || 0,
          }
        case "EXTRA_CLEANING":
          const cleaningRefund = {
            LOW: (totalDeposit || 0) * 0.075,
            MEDIUM: (totalDeposit || 0) * 0.20,
            HIGH: (totalDeposit || 0) * 0.40,
            CRITICAL: (totalDeposit || 0) * 0.70,
          }
          const cleaningPoints = {
            LOW: 1,
            MEDIUM: 3,
            HIGH: 5,
            CRITICAL: 8,
          }
          return {
            refund: cleaningRefund[severity as keyof typeof cleaningRefund] || 0,
            penaltyPoints: cleaningPoints[severity as keyof typeof cleaningPoints] || 0,
          }
        case "HOUSE_RULE_VIOLATION":
          const violationRefund = {
            LOW: 0,
            MEDIUM: (totalDeposit || 0) * 0.15,
            HIGH: (totalDeposit || 0) * 0.50,
            CRITICAL: totalDeposit || 0,
          }
          const violationPoints = {
            LOW: 2,
            MEDIUM: 5,
            HIGH: 10,
            CRITICAL: 15,
          }
          return {
            refund: violationRefund[severity as keyof typeof violationRefund] || 0,
            penaltyPoints: violationPoints[severity as keyof typeof violationPoints] || 0,
          }
        case "UNAUTHORIZED_GUESTS_OR_STAY":
          const unauthorizedRefund = {
            LOW: (totalDeposit || 0) * 0.10,
            MEDIUM: (totalDeposit || 0) * 0.325,
            HIGH: (totalDeposit || 0) * 0.70,
            CRITICAL: totalDeposit || 0,
          }
          const unauthorizedPoints = {
            LOW: 3,
            MEDIUM: 7,
            HIGH: 12,
            CRITICAL: 20,
          }
          return {
            refund: unauthorizedRefund[severity as keyof typeof unauthorizedRefund] || 0,
            penaltyPoints: unauthorizedPoints[severity as keyof typeof unauthorizedPoints] || 0,
          }
        default:
          return { refund: 0, penaltyPoints: 0 }
      }
    }
  }

  const getAllReclamationTypes = (): string[] => {
    return [
      "ACCESS_ISSUE",
      "NOT_AS_DESCRIBED",
      "CLEANLINESS",
      "SAFETY_HEALTH",
      "PROPERTY_DAMAGE",
      "EXTRA_CLEANING",
      "HOUSE_RULE_VIOLATION",
      "UNAUTHORIZED_GUESTS_OR_STAY",
    ]
  }

  // Pagination
  const totalPages = Math.ceil(filteredReclamations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReclamations = filteredReclamations.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reclamations Management</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search reclamations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Role</label>
            <Select value={filterByRole} onValueChange={(value: "ALL" | "GUEST" | "HOST") => setFilterByRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="GUEST">Guest Complaints</SelectItem>
                <SelectItem value="HOST">Host Complaints</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Severity</label>
            <Select value={filterBySeverity} onValueChange={(value: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") => setFilterBySeverity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Type</label>
            <Select value={filterByType} onValueChange={setFilterByType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {getAllReclamationTypes().map((type) => (
                  <SelectItem key={type} value={type}>
                    {getTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilterByRole("ALL")
                setFilterBySeverity("ALL")
                setFilterByType("ALL")
                setSearchQuery("")
              }}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Complainant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReclamations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No reclamations found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReclamations.map((reclamation) => (
                  <TableRow key={reclamation.id}>
                    <TableCell className="font-medium">{reclamation.id}</TableCell>
                    <TableCell>{reclamation.bookingId}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{getTypeLabel(reclamation.type)}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${reclamation.complainantRole === "GUEST"
                            ? "border-blue-500 text-blue-700 bg-blue-50"
                            : "border-purple-500 text-purple-700 bg-purple-50"
                            }`}
                        >
                          {reclamation.complainantRole}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          #{reclamation.complainantId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(reclamation.status)}</TableCell>
                    <TableCell>{getSeverityBadge(reclamation.severity)}</TableCell>
                    <TableCell>
                      {reclamation.refundAmount ? (
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <DollarSign className="w-4 h-4" />
                          <span>{reclamation.refundAmount.toFixed(2)} MAD</span>
                        </div>
                      ) : reclamation.status === "OPEN" || reclamation.status === "IN_REVIEW" ? (
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Info className="w-3 h-3" />
                          <span>Calculated on resolve</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reclamation.penaltyPoints !== undefined && reclamation.penaltyPoints !== null ? (
                        <Badge
                          variant="outline"
                          className={
                            reclamation.penaltyPoints >= 15
                              ? "border-red-500 text-red-700 bg-red-50"
                              : reclamation.penaltyPoints >= 10
                                ? "border-orange-500 text-orange-700 bg-orange-50"
                                : ""
                          }
                        >
                          {reclamation.penaltyPoints} pts
                        </Badge>
                      ) : reclamation.status === "OPEN" || reclamation.status === "IN_REVIEW" ? (
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Info className="w-3 h-3" />
                          <span>Calculated on resolve</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(reclamation.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View Button - Always visible */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(reclamation)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Actions for OPEN status */}
                        {reclamation.status === "OPEN" && (
                          <>
                            {/* Severity Button - Only for types that need severity */}
                            {reclamation.type !== "ACCESS_ISSUE" &&
                              reclamation.type !== "NOT_AS_DESCRIBED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReclamation(reclamation)
                                    setSeverityDialogOpen(true)
                                    setSelectedSeverity(reclamation.severity)
                                  }}
                                  disabled={actionLoading[`severity-${reclamation.id}`]}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300"
                                  title="Update Severity"
                                >
                                  {actionLoading[`severity-${reclamation.id}`] ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                  )}
                                  <span className="text-xs">Severity</span>
                                </Button>
                              )}

                            {/* Review Button - Available for all OPEN reclamations */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReview(reclamation.id)}
                              disabled={actionLoading[`review-${reclamation.id}`]}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300"
                              title="Move to Review (IN_REVIEW)"
                            >
                              {actionLoading[`review-${reclamation.id}`] ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <Clock className="w-4 h-4 mr-1" />
                              )}
                              <span className="text-xs">Review</span>
                            </Button>
                          </>
                        )}

                        {/* Actions for IN_REVIEW status */}
                        {reclamation.status === "IN_REVIEW" && (
                          <>
                            {/* Severity Button - Also available in IN_REVIEW for types that need it */}
                            {reclamation.type !== "ACCESS_ISSUE" &&
                              reclamation.type !== "NOT_AS_DESCRIBED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReclamation(reclamation)
                                    setSeverityDialogOpen(true)
                                    setSelectedSeverity(reclamation.severity)
                                  }}
                                  disabled={actionLoading[`severity-${reclamation.id}`]}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300"
                                  title="Update Severity"
                                >
                                  {actionLoading[`severity-${reclamation.id}`] ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                  )}
                                  <span className="text-xs">Severity</span>
                                </Button>
                              )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReclamation(reclamation)
                                setResolveDialogOpen(true)
                                setResolutionNotes("")
                              }}
                              disabled={actionLoading[`resolve-${reclamation.id}`]}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                              title="Approve Reclamation"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              <span className="text-xs">Approve</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReclamation(reclamation)
                                setRejectDialogOpen(true)
                                setRejectionNotes("")
                              }}
                              disabled={actionLoading[`reject-${reclamation.id}`]}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                              title="Reject Reclamation"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              <span className="text-xs">Reject</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredReclamations.length)} of{" "}
              {filteredReclamations.length} reclamations
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => {
        setViewDialogOpen(open)
        if (!open) {
          // Clear attachments when dialog closes
          setAttachments([])
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reclamation Details</DialogTitle>
          </DialogHeader>
          {selectedReclamation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">ID</label>
                  <p className="text-sm text-gray-900">{selectedReclamation.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Booking ID</label>
                  <p className="text-sm text-gray-900">{selectedReclamation.bookingId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{getTypeLabel(selectedReclamation.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div>{getStatusBadge(selectedReclamation.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Severity</label>
                  <div>{getSeverityBadge(selectedReclamation.severity)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Complainant</label>
                  <p className="text-sm text-gray-900">
                    {selectedReclamation.complainantRole} (#{selectedReclamation.complainantId})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Target User</label>
                  <p className="text-sm text-gray-900">#{selectedReclamation.targetUserId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedReclamation.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedReclamation.title && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <p className="text-sm text-gray-900">{selectedReclamation.title}</p>
                </div>
              )}
              {selectedReclamation.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedReclamation.description}
                  </p>
                </div>
              )}
              {/* Expected Penalty Calculation (for OPEN/IN_REVIEW) */}
              {(selectedReclamation.status === "OPEN" || selectedReclamation.status === "IN_REVIEW") && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <label className="text-sm font-semibold text-blue-900">Expected Penalty (if approved)</label>
                  </div>
                  {(() => {
                    const expected = calculateExpectedPenalty(
                      selectedReclamation.type,
                      selectedReclamation.severity,
                      selectedReclamation.complainantRole,
                      undefined, // We don't have rent/deposit in the reclamation object
                      undefined
                    )
                    return (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <span className="text-xs text-blue-700">Expected Refund:</span>
                          <p className="text-sm text-blue-900 font-semibold">
                            {expected.refund > 0 ? `${expected.refund.toFixed(2)} MAD` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-blue-700">Expected Penalty Points:</span>
                          <p className="text-sm text-blue-900 font-semibold">
                            {expected.penaltyPoints} points
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                  <p className="text-xs text-blue-600 mt-2">
                    Note: Actual amounts depend on booking rent/deposit values
                  </p>
                </div>
              )}
              {selectedReclamation.refundAmount && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Refund Amount</label>
                  <p className="text-sm text-green-600 font-semibold">
                    {selectedReclamation.refundAmount.toFixed(2)} MAD
                  </p>
                </div>
              )}
              {selectedReclamation.penaltyPoints !== undefined && selectedReclamation.penaltyPoints !== null && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Penalty Points</label>
                  <p className={`text-sm font-semibold ${selectedReclamation.penaltyPoints >= 15
                    ? "text-red-600"
                    : selectedReclamation.penaltyPoints >= 10
                      ? "text-orange-600"
                      : "text-red-600"
                    }`}>
                    {selectedReclamation.penaltyPoints} points
                  </p>
                  {selectedReclamation.penaltyPoints >= 15 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ High penalty - may trigger account suspension
                    </p>
                  )}
                </div>
              )}
              {selectedReclamation.resolutionNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Resolution Notes</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedReclamation.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Action Buttons for OPEN and IN_REVIEW status */}
              {(selectedReclamation.status === "OPEN" || selectedReclamation.status === "IN_REVIEW") && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  {/* Severity Button - Only for types that need severity */}
                  {selectedReclamation.type !== "ACCESS_ISSUE" &&
                    selectedReclamation.type !== "NOT_AS_DESCRIBED" && (
                      <Button
                        onClick={() => {
                          setViewDialogOpen(false)
                          setSeverityDialogOpen(true)
                          setSelectedSeverity(selectedReclamation.severity)
                        }}
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Update Severity
                      </Button>
                    )}

                  {/* Review Button - Only for OPEN status */}
                  {selectedReclamation.status === "OPEN" && (
                    <Button
                      onClick={async () => {
                        setViewDialogOpen(false)
                        await handleReview(selectedReclamation.id)
                      }}
                      variant="outline"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      disabled={actionLoading[`review-${selectedReclamation.id}`]}
                    >
                      {actionLoading[`review-${selectedReclamation.id}`] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4 mr-2" />
                      )}
                      Move to Review
                    </Button>
                  )}

                  {/* Approve/Reject Buttons - Only for IN_REVIEW status */}
                  {selectedReclamation.status === "IN_REVIEW" && (
                    <>
                      <Button
                        onClick={() => {
                          setViewDialogOpen(false)
                          setResolveDialogOpen(true)
                          setResolutionNotes("")
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Reclamation
                      </Button>
                      <Button
                        onClick={() => {
                          setViewDialogOpen(false)
                          setRejectDialogOpen(true)
                          setRejectionNotes("")
                        }}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Reclamation
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Attachments/Images Section */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Attachments</label>
                {loadingAttachments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading images...</span>
                  </div>
                ) : attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {attachments.map((attachment, index) => {
                      // Build image URL from filePath
                      // filePath format: "reclamationId/filename" (e.g., "4/8c2f0278-d8d5-45d7-bee6-606f82cb0347.png")
                      let filename = attachment.filePath
                      if (attachment.filePath.includes('/')) {
                        // Extract filename from path like "4/filename.png"
                        filename = attachment.filePath.split('/').pop() || attachment.filePath
                      }
                      // Remove any backslashes (Windows paths)
                      filename = filename.replace(/\\/g, '/').split('/').pop() || filename

                      const imageUrl = `${RECLAMATION_API_BASE_URL}/api/admin/reclamations/files/${selectedReclamation.id}/${encodeURIComponent(filename)}`
                      console.log("🖼️ Image URL:", imageUrl, "from filePath:", attachment.filePath)
                      return (
                        <div key={attachment.id || index} className="relative group">
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow">
                            <div
                              className="relative cursor-pointer"
                              onClick={() => window.open(imageUrl, '_blank')}
                              title="Click to view full size"
                            >
                              <img
                                src={imageUrl}
                                alt={attachment.fileName || `Attachment ${index + 1}`}
                                className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  console.error("❌ Failed to load image:", imageUrl, "from filePath:", attachment.filePath)
                                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E"
                                }}
                                onLoad={() => {
                                  console.log("✅ Image loaded successfully:", imageUrl)
                                }}
                              />
                              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to enlarge
                              </div>
                            </div>
                            <div className="p-2 bg-white border-t border-gray-200">
                              <p className="text-xs text-gray-600 truncate" title={attachment.fileName}>
                                {attachment.fileName || `Image ${index + 1}`}
                              </p>
                              {attachment.fileSize && (
                                <p className="text-xs text-gray-400">
                                  {(attachment.fileSize / 1024).toFixed(2)} KB
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No images attached to this reclamation</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Severity Dialog */}
      <Dialog open={severityDialogOpen} onOpenChange={setSeverityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Severity</DialogTitle>
            <DialogDescription>
              {selectedReclamation &&
                (selectedReclamation.type === "ACCESS_ISSUE" || selectedReclamation.type === "NOT_AS_DESCRIBED") ? (
                <span className="text-red-600 font-semibold">
                  ⚠️ Severity cannot be changed for {getTypeLabel(selectedReclamation.type)} - these types have fixed penalties
                </span>
              ) : (
                "Change the severity level of this reclamation"
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedReclamation &&
            (selectedReclamation.type === "ACCESS_ISSUE" || selectedReclamation.type === "NOT_AS_DESCRIBED") ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This reclamation type ({getTypeLabel(selectedReclamation.type)}) has a fixed penalty:
                <br />
                • <strong>10 penalty points</strong> deducted from host
                <br />
                • <strong>Full refund</strong> (Rent + Deposit) to guest
                <br />
                Severity level does not affect the penalty for this type.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Severity</label>
                <Select
                  value={selectedSeverity}
                  onValueChange={(value: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") =>
                    setSelectedSeverity(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSeverityDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateSeverity}
                  disabled={actionLoading[`severity-${selectedReclamation?.id}`]}
                >
                  {actionLoading[`severity-${selectedReclamation?.id}`] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Reclamation</DialogTitle>
            <DialogDescription>
              Approve or reject this reclamation. If approved, penalties will be calculated automatically based on type and severity.
            </DialogDescription>
          </DialogHeader>
          {selectedReclamation && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Penalty Preview</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Type: <strong>{getTypeLabel(selectedReclamation.type)}</strong> |
                    Severity: <strong>{selectedReclamation.severity}</strong> |
                    Role: <strong>{selectedReclamation.complainantRole}</strong>
                  </p>
                  {(() => {
                    const expected = calculateExpectedPenalty(
                      selectedReclamation.type,
                      selectedReclamation.severity,
                      selectedReclamation.complainantRole
                    )
                    return (
                      <div className="mt-2 text-xs">
                        <p className="text-yellow-800">
                          Expected: <strong>{expected.refund > 0 ? `${expected.refund.toFixed(2)} MAD refund` : "No refund"}</strong> and <strong>{expected.penaltyPoints} penalty points</strong>
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Resolution Notes</label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResolveDialogOpen(false)
                  setResolutionNotes("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResolve(false)}
                disabled={actionLoading[`resolve-${selectedReclamation?.id}`]}
              >
                {actionLoading[`resolve-${selectedReclamation?.id}`] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
              <Button
                onClick={() => handleResolve(true)}
                disabled={actionLoading[`resolve-${selectedReclamation?.id}`]}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading[`resolve-${selectedReclamation?.id}`] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Approve"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Reclamation</DialogTitle>
            <DialogDescription>
              Reject this reclamation and provide a reason
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Rejection Notes</label>
              <Textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false)
                  setRejectionNotes("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading[`reject-${selectedReclamation?.id}`]}
              >
                {actionLoading[`reject-${selectedReclamation?.id}`] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

