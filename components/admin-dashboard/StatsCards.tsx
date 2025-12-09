"use client"

import { Card } from "@/components/ui/card"
import { Building2, Users, Calendar, DollarSign, TrendingUp, AlertCircle } from "lucide-react"

interface AdminStatsCardsProps {
  totalProperties: number
  totalUsers: number
  totalBookings: number
  totalRevenue: number
  pendingApprovals: number
  activeBookings: number
}

export function AdminStatsCards({
  totalProperties,
  totalUsers,
  totalBookings,
  totalRevenue,
  pendingApprovals,
  activeBookings,
}: AdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Total Properties */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Properties</p>
            <p className="text-3xl font-bold text-gray-900">{totalProperties}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </Card>

      {/* Total Users */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-full">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </Card>

      {/* Total Bookings */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900">{totalBookings}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </Card>

      {/* Total Revenue */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{totalRevenue.toFixed(2)} ETH</p>
          </div>
          <div className="p-3 bg-teal-100 rounded-full">
            <DollarSign className="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </Card>

      {/* Pending Approvals */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending Approvals</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingApprovals}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </Card>

      {/* Active Bookings */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Active Bookings</p>
            <p className="text-3xl font-bold text-gray-900">{activeBookings}</p>
          </div>
          <div className="p-3 bg-indigo-100 rounded-full">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </Card>
    </div>
  )
}

