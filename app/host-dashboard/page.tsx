"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/services/api"
import { HostNavBar } from "@/components/host-dashboard/HostNavBar"
import { StatsCards } from "@/components/host-dashboard/StatsCards"
import { CurrentBookings } from "@/components/host-dashboard/CurrentBookings"
import { CheckoutRequests } from "@/components/host-dashboard/CheckoutRequests"
import { PendingNegotiations } from "@/components/host-dashboard/PendingNegotiations"
import { CompletedBookings } from "@/components/host-dashboard/CompletedBookings"
import { PropertiesList } from "@/components/host-dashboard/PropertiesList"
import { PaidBookings } from "@/components/host-dashboard/PaidBookings"
import { Calendar } from "@/components/host-dashboard/Calendar"
import { HostReclamations } from "@/components/host-dashboard/HostReclamations"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function HostDashboardPage() {
  const { user, isLoading: authLoading, token } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("paid")

  // Stats data
  const [propertiesCount, setPropertiesCount] = useState(0)
  const [currentBookingsCount, setCurrentBookingsCount] = useState(0)
  const [pendingNegotiationsCount, setPendingNegotiationsCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    // Check if user is a host or admin
    if (!authLoading && user) {
      const isAdmin = user.roles?.includes("ADMIN")
      const isPoster = user.roles?.includes("POSTER")
      const isHost = (user.roles as string[])?.includes("HOST")

      // Allow admin, poster, or host access
      if (!isAdmin && !isPoster && !isHost) {
        router.push("/")
        return
      }
    }

    if (user && token) {
      fetchStats()
    }
  }, [user, token, authLoading, router])

  const fetchStats = async () => {
    if (!user?.id) return

    try {
      setIsLoadingStats(true)
      const userId = parseInt(String(user.id))

      // Fetch all stats in parallel
      const [properties, currentBookings, pendingNegotiations, allBookings] = await Promise.all([
        apiClient.properties.getMyProperties().catch(() => []),
        apiClient.bookings.getCurrentBookingsByOwner(userId).catch(() => []),
        apiClient.bookings.getPendingNegotiations(userId).catch(() => []),
        apiClient.bookings.getByOwnerId(userId).catch(() => []),
      ])

      setPropertiesCount(properties.length)
      setCurrentBookingsCount(currentBookings.length)
      setPendingNegotiationsCount(pendingNegotiations.length)

      // Calculate total revenue from completed bookings
      const completedBookings = allBookings.filter((b: any) => b.status === "COMPLETED")
      const revenue = completedBookings.reduce((sum: number, booking: any) => {
        return sum + (booking.totalPrice || 0)
      }, 0)
      setTotalRevenue(revenue)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const handleUpdate = () => {
    // Refresh stats when bookings/properties are updated
    fetchStats()
  }

  if (authLoading || isLoadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-teal-600 mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-teal-100 rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userId = user.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6">
        </div>

        {/* Navigation Bar */}
        <div className="relative z-10">
          <HostNavBar activeSection={activeSection} onSectionChange={handleSectionChange} />
        </div>

        {/* Content Section */}
        <div className="mt-8">
          {activeSection === "paid" && (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">Paid Bookings</h2>
              <PaidBookings ownerId={userId} />
            </div>
          )}

          {activeSection === "negotiations" && (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">Pending Approvals</h2>
              <PendingNegotiations ownerId={userId} onUpdate={handleUpdate} />
            </div>
          )}

          {activeSection === "current" && (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">Current Bookings</h2>
              <CurrentBookings ownerId={userId} onUpdate={handleUpdate} />
            </div>
          )}

          {activeSection === "checkout-requests" && (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">Checkout Requests</h2>
              <CheckoutRequests ownerId={userId} onUpdate={handleUpdate} />
            </div>
          )}

          {activeSection === "calendar" && (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">Calendar</h2>
              <Calendar ownerId={userId} />
            </div>
          )}

          {(activeSection === "my-properties" ||
            activeSection === "draft" ||
            activeSection === "pending-approval" ||
            activeSection === "approved" ||
            activeSection === "disapproved" ||
            activeSection === "suspended" ||
            activeSection === "hidden") && (
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">
                  {activeSection === "my-properties" && "All Properties"}
                  {activeSection === "draft" && "Draft Properties"}
                  {activeSection === "pending-approval" && "Pending Approval"}
                  {activeSection === "approved" && "Approved Properties"}
                  {activeSection === "disapproved" && "Disapproved Properties"}
                  {activeSection === "suspended" && "Suspended Properties"}
                  {activeSection === "hidden" && "Hidden Properties"}
                </h2>
                <PropertiesList
                  userId={userId}
                  onUpdate={handleUpdate}
                  filter={
                    activeSection === "draft" ? "draft" :
                      activeSection === "pending-approval" ? "pending-approval" :
                        activeSection === "approved" ? "approved" :
                          activeSection === "disapproved" ? "disapproved" :
                            activeSection === "suspended" ? "suspended" :
                              activeSection === "hidden" ? "hidden" :
                                "all"
                  }
                />
              </div>
            )}

          {(activeSection === "my-complaints" || activeSection === "complaints-against-me") && (
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">
                {activeSection === "my-complaints" && "My Complaints"}
                {activeSection === "complaints-against-me" && "Complaints Against Me"}
              </h2>
              <HostReclamations
                ownerId={userId}
                filter={activeSection === "my-complaints" ? "my-complaints" : "complaints-against-me"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

