"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/services/api"
import { Card } from "@/components/ui/card"
import { Loader2, Calendar as CalendarIcon, MapPin } from "lucide-react"
import type { Property } from "@/lib/types"

interface Booking {
  id: number
  userId: number
  propertyId: number | string
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  status: string
}

interface BookingWithProperty extends Booking {
  property?: Property
}

interface CalendarProps {
  ownerId: string | number
}

export function Calendar({ ownerId }: CalendarProps) {
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchBookings()
  }, [ownerId])

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.bookings.getConfirmedBookingsByOwner(parseInt(String(ownerId)))
      
      // Fetch property details for each booking
      const bookingsWithProperties = await Promise.all(
        data.map(async (booking: Booking) => {
          try {
            const property = await apiClient.properties.getById(String(booking.propertyId))
            return { ...booking, property }
          } catch {
            return { ...booking, property: undefined }
          }
        })
      )
      
      setBookings(bookingsWithProperties)
    } catch (err: any) {
      setError(err.message || "Failed to load calendar")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return dateString
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const isDateInRange = (date: Date, checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    checkInDate.setHours(0, 0, 0, 0)
    checkOutDate.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    
    return date >= checkInDate && date <= checkOutDate
  }

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isDateInRange(date, booking.checkInDate, booking.checkOutDate)
    )
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        <p className="ml-4 text-gray-600">Loading calendar...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-700">{error}</p>
      </Card>
    )
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateMonth("prev")}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          ← Prev
        </button>
        <h3 className="text-xl font-bold text-gray-900">{monthName}</h3>
        <button
          onClick={() => navigateMonth("next")}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <Card className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}
          
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Days of the month */}
          {days.map(day => {
            const date = new Date(year, month, day)
            const dayBookings = getBookingsForDate(date)
            const isToday = 
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear()
            
            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 ${
                  isToday ? "border-teal-500 bg-teal-50" : "border-gray-200"
                } ${dayBookings.length > 0 ? "bg-green-50 border-green-300" : ""}`}
              >
                <div className={`text-sm font-semibold mb-1 ${isToday ? "text-teal-700" : "text-gray-900"}`}>
                  {day}
                </div>
                {dayBookings.length > 0 && (
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map(booking => (
                      <div
                        key={booking.id}
                        className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded truncate"
                        title={booking.property?.title || `Booking ${booking.id}`}
                      >
                        {booking.property?.title || `B${booking.id}`}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs text-green-700 font-semibold">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Bookings List */}
      {bookings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Bookings</h3>
          <div className="space-y-3">
            {bookings
              .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())
              .slice(0, 10)
              .map(booking => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {booking.property?.title || `Property ${booking.propertyId}`}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                      </span>
                      {booking.property?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {booking.property.address.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-teal-600">
                      {booking.totalPrice?.toFixed(0)} MAD
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {bookings.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No bookings</h2>
          <p className="text-gray-600">You don't have any confirmed bookings to display.</p>
        </Card>
      )}
    </div>
  )
}

