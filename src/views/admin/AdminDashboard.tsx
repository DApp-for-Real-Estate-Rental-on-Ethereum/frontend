"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { XCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useProperties } from "@/hooks/useProperties"
import type { Property } from "@/types"

export function AdminDashboard() {
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const { properties } = useProperties()
  const [pendingProperties, setPendingProperties] = useState<Property[]>([])
  const [suspendedProperties, setSuspendedProperties] = useState<Property[]>([])

  useEffect(() => {
    if (!hasRole("ADMIN")) {
      navigate("/")
      return
    }

    const pending = properties.filter((p) => p.status === "PENDING_APPROVAL")
    const suspended = properties.filter((p) => p.status === "SUSPENDED")

    setPendingProperties(pending)
    setSuspendedProperties(suspended)
  }, [properties, hasRole, navigate])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage properties and verification requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Properties</p>
                <p className="text-3xl font-bold text-gray-900">{properties.length}</p>
              </div>
              <AlertCircle className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingProperties.length}</p>
              </div>
              <AlertCircle className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Suspended</p>
                <p className="text-3xl font-bold text-red-600">{suspendedProperties.length}</p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* Pending Properties */}
        <div className="bg-white rounded-xl shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending Approval ({pendingProperties.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Property</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Owner</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingProperties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                      No pending properties
                    </td>
                  </tr>
                ) : (
                  pendingProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/admin/property/${property.id}`)}
                          className="text-teal-600 hover:underline font-medium"
                        >
                          {property.title}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{property.userId}</td>
                      <td className="px-6 py-4 text-gray-700">${property.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/admin/property/${property.id}`)}
                          className="text-teal-600 hover:underline font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suspended Properties */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Suspended Properties ({suspendedProperties.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Property</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suspendedProperties.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-600">
                      No suspended properties
                    </td>
                  </tr>
                ) : (
                  suspendedProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{property.title}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {property.suspensions?.[0]?.reason || "No reason provided"}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-teal-600 hover:underline font-medium">Unsuspend</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
