"use client"

import { useState, useEffect } from "react"
import type { Property, CreatePropertyRequest, UpdatePropertyRequest } from "@/types"
import { apiClient } from "@/services/api"

export interface UsePropertiesReturn {
  properties: Property[]
  loading: boolean
  error: string | null
  createProperty: (data: CreatePropertyRequest, images: File[]) => Promise<string>
  updateProperty: (id: string, data: UpdatePropertyRequest) => Promise<void>
  deleteProperty: (id: string) => Promise<void>
  approveProperty: (id: string, approve: boolean) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * useProperties hook
 *
 * Manages property listings with CRUD operations
 * Usage: const { properties, createProperty } = useProperties()
 */
export function useProperties(): UsePropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperties = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.properties.getAll()
      setProperties(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch properties"
      setError(message)
      console.error("[v0] Error fetching properties:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  const createProperty = async (data: CreatePropertyRequest, images: File[]): Promise<string> => {
    try {
      const result = await apiClient.properties.create(data, images)
      await fetchProperties()
      return result.id
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create property"
      setError(message)
      throw err
    }
  }

  const updateProperty = async (id: string, data: UpdatePropertyRequest): Promise<void> => {
    try {
      await apiClient.properties.update(id, data)
      await fetchProperties()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update property"
      setError(message)
      throw err
    }
  }

  const deleteProperty = async (id: string): Promise<void> => {
    try {
      await apiClient.properties.delete(id)
      await fetchProperties()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete property"
      setError(message)
      throw err
    }
  }

  const approveProperty = async (id: string, approve: boolean): Promise<void> => {
    try {
      await apiClient.properties.approve(id, approve)
      await fetchProperties()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve property"
      setError(message)
      throw err
    }
  }

  return {
    properties,
    loading,
    error,
    createProperty,
    updateProperty,
    deleteProperty,
    approveProperty,
    refetch: fetchProperties,
  }
}
