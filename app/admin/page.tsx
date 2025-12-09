"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import { AdminNavBar } from "@/components/admin-dashboard/AdminNavBar"
import { PropertiesManagement } from "@/components/admin-dashboard/PropertiesManagement"
import { UsersManagement } from "@/components/admin-dashboard/UsersManagement"
import { BookingsManagement } from "@/components/admin-dashboard/BookingsManagement"
import { ReclamationsManagement } from "@/components/admin-dashboard/ReclamationsManagement"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>("all-properties")

  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/login")
      return
    }
    
    if (user && !user.roles?.includes("ADMIN")) {
      router.push("/")
      return
    }
  }, [user, authLoading, router])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
        </div>

        {/* Navigation Bar */}
        <div className="relative z-10">
          <AdminNavBar activeSection={activeSection} onSectionChange={handleSectionChange} />
        </div>

        {/* Content Section */}
        <div className="mt-8">
          {/* Properties Sections */}
          {(activeSection === "all-properties" || 
            activeSection === "pending-approval" || 
            activeSection === "approved" ||
            activeSection === "suspended" ||
            activeSection === "disapproved") && (
            <PropertiesManagement 
              filter={
                activeSection === "pending-approval" ? "pending-approval" :
                activeSection === "approved" ? "approved" :
                activeSection === "suspended" ? "suspended" :
                activeSection === "disapproved" ? "disapproved" :
                "all-properties"
              }
            />
          )}

          {/* Users Sections */}
          {(activeSection === "all-users" || 
            activeSection === "admins" || 
            activeSection === "hosts" ||
            activeSection === "tenants" ||
            activeSection === "disabled") && (
            <UsersManagement 
              filter={
                activeSection === "admins" ? "admins" :
                activeSection === "hosts" ? "hosts" :
                activeSection === "tenants" ? "tenants" :
                activeSection === "disabled" ? "disabled" :
                "all-users"
              }
            />
          )}

          {/* Bookings Sections */}
          {(activeSection === "all-bookings" || 
            activeSection === "pending-payment" || 
            activeSection === "active" ||
            activeSection === "completed" ||
            activeSection === "cancelled") && (
            <BookingsManagement 
              filter={
                activeSection === "pending-payment" ? "pending-payment" :
                activeSection === "active" ? "active" :
                activeSection === "completed" ? "completed" :
                activeSection === "cancelled" ? "cancelled" :
                "all-bookings"
              }
            />
          )}

          {/* Reclamations Sections */}
          {(activeSection === "all-reclamations" || 
            activeSection === "open-reclamations" || 
            activeSection === "in-review-reclamations" ||
            activeSection === "resolved-reclamations" ||
            activeSection === "rejected-reclamations") && (
            <ReclamationsManagement 
              filter={
                activeSection === "open-reclamations" ? "open-reclamations" :
                activeSection === "in-review-reclamations" ? "in-review-reclamations" :
                activeSection === "resolved-reclamations" ? "resolved-reclamations" :
                activeSection === "rejected-reclamations" ? "rejected-reclamations" :
                "all-reclamations"
              }
            />
          )}

          {/* Other Sections - Placeholder */}
          {!(activeSection === "all-properties" || 
            activeSection === "pending-approval" || 
            activeSection === "suspended" ||
            activeSection === "all-users" ||
            activeSection === "admins" ||
            activeSection === "hosts" ||
            activeSection === "tenants" ||
            activeSection === "disabled" ||
            activeSection === "all-bookings" ||
            activeSection === "pending-payment" ||
            activeSection === "active" ||
            activeSection === "completed" ||
            activeSection === "cancelled" ||
            activeSection === "all-reclamations" ||
            activeSection === "open-reclamations" ||
            activeSection === "in-review-reclamations" ||
            activeSection === "resolved-reclamations" ||
            activeSection === "rejected-reclamations") && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {activeSection === "overview" && "Overview"}
                {activeSection === "all-users" && "All Users"}
                {activeSection === "tenants" && "Tenants"}
                {activeSection === "hosts" && "Hosts"}
                {activeSection === "disabled" && "Disabled Accounts"}
                {activeSection === "all-bookings" && "All Bookings"}
                {activeSection === "pending-payment" && "Pending Payment"}
                {activeSection === "active" && "Active Bookings"}
                {activeSection === "completed" && "Completed Bookings"}
                {activeSection === "cancelled" && "Cancelled Bookings"}
                {activeSection === "all-transactions" && "All Transactions"}
                {activeSection === "pending" && "Pending Transactions"}
                {activeSection === "success" && "Successful Transactions"}
                {activeSection === "failed" && "Failed Transactions"}
                {activeSection === "settings" && "Blockchain Settings"}
                {activeSection === "escrows" && "Active Escrows"}
                {activeSection === "contracts" && "Contract Information"}
                {activeSection === "revenue" && "Revenue Statistics"}
                {activeSection === "reports" && "Reports"}
                {activeSection === "all-disputes" && "All Disputes"}
                {activeSection === "resolved" && "Resolved Disputes"}
              </h2>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
