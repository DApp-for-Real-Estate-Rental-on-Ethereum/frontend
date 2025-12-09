"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/services/api"
import { AddPropertyForm } from "@/components/host-dashboard/AddPropertyForm"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { Property } from "@/lib/types"

export default function EditPropertyPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const propertyId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user && propertyId) {
      fetchProperty()
    }
  }, [user, propertyId, authLoading, router])

  const fetchProperty = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.properties.getById(propertyId)
      
      // Check if user owns this property
      if (data.userId !== user?.id) {
        setError("You don't have permission to edit this property.")
        return
      }
      
      setProperty(data)
    } catch (err: any) {
      console.error("Failed to fetch property:", err)
      setError(err.message || "Failed to load property")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = () => {
    // Refresh the property list or redirect
    router.push("/host-dashboard")
    router.refresh()
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/host-dashboard")}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Go Back to Dashboard
          </button>
        </Card>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <p className="text-gray-600 mb-4">Property not found</p>
          <button
            onClick={() => router.push("/host-dashboard")}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Go Back to Dashboard
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AddPropertyForm
          propertyId={propertyId}
          propertyData={property}
          isEditMode={true}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )
}

