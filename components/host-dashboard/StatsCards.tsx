"use client"

import { Card } from "@/components/ui/card"
import { Building2, Calendar, Handshake, DollarSign } from "lucide-react"

interface StatsCardsProps {
  propertiesCount: number
  currentBookingsCount: number
  pendingNegotiationsCount: number
  totalRevenue?: number
}

export function StatsCards({
  propertiesCount,
  currentBookingsCount,
  pendingNegotiationsCount,
  totalRevenue = 0,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Properties Count */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Properties</p>
            <p className="text-3xl font-bold text-gray-900">{propertiesCount}</p>
          </div>
          <div className="p-3 bg-teal-100 rounded-full">
            <Building2 className="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </Card>

      {/* Current Bookings */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Current Bookings</p>
            <p className="text-3xl font-bold text-gray-900">{currentBookingsCount}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </Card>

      {/* Pending Negotiations */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending Negotiations</p>
            <p className="text-3xl font-bold text-gray-900">{pendingNegotiationsCount}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-full">
            <Handshake className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </Card>

      {/* Total Revenue */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              {totalRevenue.toFixed(4)} ETH
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </Card>
    </div>
  )
}

