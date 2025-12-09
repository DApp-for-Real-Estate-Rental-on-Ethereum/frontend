"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/services/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { AddPropertyForm } from "./AddPropertyForm"
import type { Property } from "@/lib/types"

interface EditPropertyModalProps {
  propertyId: string
  onClose: () => void
  onSuccess: () => void
}

export function EditPropertyModal({ propertyId, onClose, onSuccess }: EditPropertyModalProps) {
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setIsLoading(true)
        setError("")
        const data = await apiClient.properties.getById(propertyId)
        setProperty(data)
      } catch (err: any) {
        setError(err.message || "Failed to load property")
      } finally {
        setIsLoading(false)
      }
    }

    if (propertyId) {
      fetchProperty()
    }
  }, [propertyId])

  const handleSuccess = () => {
    onSuccess()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Edit Property</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="ml-4 text-gray-600">Loading property data...</p>
          </div>
        ) : error ? (
          <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : property ? (
          <AddPropertyForm
            key={propertyId}
            propertyId={propertyId}
            propertyData={property}
            isEditMode={true}
            onSuccess={handleSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

