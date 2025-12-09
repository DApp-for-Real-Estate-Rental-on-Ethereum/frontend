"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Calendar, DollarSign, User, Building2, ExternalLink, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"

interface AdminBooking {
  id: number
  userId: number
  propertyId: string
  propertyTitle: string
  propertyAddress: string
  ownerId: number | null
  tenantName: string
  tenantEmail: string
  hostName: string
  hostEmail: string
  checkInDate: string
  checkOutDate: string
  numberOfNights: number | null
  totalPrice: number | null
  longStayDiscountPercent: number | null
  requestedNegotiationPercent: number | null
  status: string
  onChainTxHash: string | null
  negotiationExpiresAt: string | null
  createdAt: string
  updatedAt: string | null
}

interface BookingsManagementProps {
  filter: "all-bookings" | "pending-payment" | "active" | "completed" | "cancelled"
}

export function BookingsManagement({ filter }: BookingsManagementProps) {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    filterBookings()
    setCurrentPage(1) // Reset to first page when filter or search changes
  }, [bookings, filter, searchQuery])

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.bookings.getAllForAdmin()
      setBookings(data)
    } catch (err: any) {
      setError(err.message || "Failed to load bookings")
    } finally {
      setIsLoading(false)
    }
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    // Filter by status
    if (filter === "pending-payment") {
      filtered = filtered.filter((b) => b.status === "PENDING_PAYMENT")
    } else if (filter === "active") {
      filtered = filtered.filter((b) => 
        b.status === "CONFIRMED" || b.status === "TENANT_CHECKED_OUT"
      )
    } else if (filter === "completed") {
      filtered = filtered.filter((b) => b.status === "COMPLETED")
    } else if (filter === "cancelled") {
      filtered = filtered.filter((b) => b.status === "CANCELLED")
    }
    // "all-bookings" shows all statuses

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.propertyTitle.toLowerCase().includes(query) ||
          b.tenantName.toLowerCase().includes(query) ||
          b.hostName.toLowerCase().includes(query) ||
          b.propertyAddress.toLowerCase().includes(query) ||
          b.id.toString().includes(query)
      )
    }

    setFilteredBookings(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING_PAYMENT: { label: "Pending Payment", className: "bg-yellow-600" },
      PENDING_NEGOTIATION: { label: "Pending Negotiation", className: "bg-orange-600" },
      CONFIRMED: { label: "Confirmed", className: "bg-blue-600" },
      TENANT_CHECKED_OUT: { label: "Checked Out", className: "bg-purple-600" },
      COMPLETED: { label: "Completed", className: "bg-green-600" },
      CANCELLED: { label: "Cancelled", className: "bg-red-600" },
      DISPUTED: { label: "Disputed", className: "bg-pink-600" },
    }

    const config = statusConfig[status] || { label: status, className: "bg-gray-600" }
    return (
      <Badge variant="default" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "-"
    return `$${price.toFixed(2)}`
  }

  const handleView = (booking: AdminBooking) => {
    setSelectedBooking(booking)
    setViewDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="ml-3 text-gray-600">Loading bookings...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchBookings} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by property, tenant, host, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </Card>

      {/* Bookings Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{booking.propertyTitle}</p>
                        <p className="text-xs text-gray-500">{booking.propertyAddress}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{booking.tenantName}</p>
                        <p className="text-xs text-gray-500">{booking.tenantEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{booking.hostName}</p>
                        <p className="text-xs text-gray-500">{booking.hostEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{formatDate(booking.checkInDate)}</p>
                        <p className="text-gray-500">to {formatDate(booking.checkOutDate)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{booking.numberOfNights || "-"} nights</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{formatPrice(booking.totalPrice)}</p>
                        {booking.longStayDiscountPercent && (
                          <p className="text-xs text-green-600">
                            {booking.longStayDiscountPercent}% discount
                          </p>
                        )}
                        {booking.requestedNegotiationPercent && (
                          <p className="text-xs text-orange-600">
                            {booking.requestedNegotiationPercent}% negotiation
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(booking)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredBookings.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredBookings.length / itemsPerPage)}
            totalItems={filteredBookings.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage)
              setCurrentPage(1)
            }}
          />
        )}
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details - #{selectedBooking?.id}</DialogTitle>
            <DialogDescription>Complete information about this booking</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Property</p>
                  <p className="text-sm font-semibold">{selectedBooking.propertyTitle}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.propertyAddress}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tenant</p>
                  <p className="text-sm">{selectedBooking.tenantName}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.tenantEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Host</p>
                  <p className="text-sm">{selectedBooking.hostName}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.hostEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Check-in</p>
                  <p className="text-sm">{formatDate(selectedBooking.checkInDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Check-out</p>
                  <p className="text-sm">{formatDate(selectedBooking.checkOutDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nights</p>
                  <p className="text-sm">{selectedBooking.numberOfNights || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Price</p>
                  <p className="text-sm font-semibold">{formatPrice(selectedBooking.totalPrice)}</p>
                </div>
                {selectedBooking.longStayDiscountPercent && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Long Stay Discount</p>
                    <p className="text-sm text-green-600">{selectedBooking.longStayDiscountPercent}%</p>
                  </div>
                )}
                {selectedBooking.requestedNegotiationPercent && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Negotiation</p>
                    <p className="text-sm text-orange-600">{selectedBooking.requestedNegotiationPercent}%</p>
                    {selectedBooking.negotiationExpiresAt && (
                      <p className="text-xs text-gray-500">
                        Expires: {formatDate(selectedBooking.negotiationExpiresAt)}
                      </p>
                    )}
                  </div>
                )}
                {selectedBooking.onChainTxHash && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Transaction Hash</p>
                    <p className="text-xs font-mono break-all">{selectedBooking.onChainTxHash}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Created At</p>
                  <p className="text-xs text-gray-500">{formatDate(selectedBooking.createdAt)}</p>
                </div>
                {selectedBooking.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Updated At</p>
                    <p className="text-xs text-gray-500">{formatDate(selectedBooking.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

