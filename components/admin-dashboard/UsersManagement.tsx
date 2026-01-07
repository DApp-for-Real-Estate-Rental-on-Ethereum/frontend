"use client"

import { useState, useEffect, JSX } from "react"
import { apiClient } from "@/lib/services/api"
import { resolveMediaUrl } from "@/lib/services/api/core"
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
import { Loader2, Search, Shield, User, Building2, CheckCircle, XCircle, Eye, Power, PowerOff, UserPlus, UserMinus, Ban, RotateCcw } from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"

interface AdminUser {
  id: number
  firstName: string
  lastName: string
  email: string
  profilePicture?: string
  birthday?: string
  phoneNumber?: number
  walletAddress?: string
  roles?: string[]
  enabled: boolean
}

interface UsersManagementProps {
  filter: "all-users" | "admins" | "hosts" | "tenants" | "disabled"
}

export function UsersManagement({ filter }: UsersManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: number | null; action: string | null; message: string }>({
    open: false,
    userId: null,
    action: null,
    message: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
    setCurrentPage(1) // Reset to first page when filter or search changes
  }, [users, filter, searchQuery])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.users.getAllForAdmin()
      setUsers(data)
    } catch (err: any) {
      setError(err.message || "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Filter by role
    if (filter === "admins") {
      filtered = filtered.filter((u) => u.roles?.includes("ADMIN"))
    } else if (filter === "hosts") {
      filtered = filtered.filter((u) =>
        u.roles?.includes("HOST") || u.roles?.includes("POSTER")
      )
    } else if (filter === "tenants") {
      filtered = filtered.filter((u) =>
        u.roles?.includes("TENANT") || u.roles?.includes("USER") ||
        (!u.roles?.includes("ADMIN") && !u.roles?.includes("HOST") && !u.roles?.includes("POSTER"))
      )
    } else if (filter === "disabled") {
      filtered = filtered.filter((u) => !u.enabled)
    }
    // "all-users" shows all users

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(query) ||
          u.lastName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          (u.phoneNumber && u.phoneNumber.toString().includes(query))
      )
    }

    setFilteredUsers(filtered)
  }

  const getRoleBadge = (roles?: string[]) => {
    if (!roles || roles.length === 0) {
      return <Badge variant="outline">No Role</Badge>
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {roles.map((role) => {
          if (role === "ADMIN") {
            return (
              <Badge key={role} variant="default" className="bg-purple-600">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )
          } else if (role === "HOST" || role === "POSTER") {
            return (
              <Badge key={role} variant="default" className="bg-blue-600">
                <Building2 className="w-3 h-3 mr-1" />
                Host
              </Badge>
            )
          } else if (role === "TENANT" || role === "USER") {
            return (
              <Badge key={role} variant="default" className="bg-green-600">
                <User className="w-3 h-3 mr-1" />
                Tenant
              </Badge>
            )
          }
          return (
            <Badge key={role} variant="outline">
              {role}
            </Badge>
          )
        })}
      </div>
    )
  }

  const getStatusBadge = (enabled: boolean) => {
    if (enabled) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="bg-red-600">
        <XCircle className="w-3 h-3 mr-1" />
        Disabled
      </Badge>
    )
  }

  const handleAction = async (userId: number, action: string) => {
    try {
      setActionLoading({ ...actionLoading, [userId]: true })
      setError("")

      switch (action) {
        case "enable":
          await apiClient.users.enableUser(userId)
          break
        case "disable":
          await apiClient.users.disableUser(userId)
          break
        case "add-admin":
          await apiClient.users.addAdminRole(userId)
          break
        case "remove-admin":
          await apiClient.users.removeAdminRole(userId)
          break
        case "add-host":
          await apiClient.users.addHostRoleByAdmin(userId)
          break
        case "remove-host":
          await apiClient.users.removeHostRole(userId)
          break
      }

      // Refresh users list
      await fetchUsers()
      setConfirmDialog({ open: false, userId: null, action: null, message: "" })
    } catch (err: any) {
      const errorMessage = err.message || err.errorData?.message || "Failed to perform action"
      setError(errorMessage)
    } finally {
      setActionLoading({ ...actionLoading, [userId]: false })
    }
  }

  const openConfirmDialog = (userId: number, action: string, message: string) => {
    setConfirmDialog({ open: true, userId, action, message })
  }

  const getActionButtons = (user: AdminUser) => {
    const buttons: JSX.Element[] = []
    const isLoading = actionLoading[user.id] || false
    const isAdmin = user.roles?.includes("ADMIN")
    const isHost = user.roles?.includes("HOST") || user.roles?.includes("POSTER")
    const isTenant = user.roles?.includes("TENANT") || user.roles?.includes("USER") || (!isAdmin && !isHost)

    // Enable/Disable buttons
    if (user.enabled) {
      buttons.push(
        <Button
          key="disable"
          size="sm"
          variant="outline"
          onClick={() => openConfirmDialog(user.id, "disable", `Are you sure you want to disable ${user.firstName} ${user.lastName}?`)}
          disabled={isLoading}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <PowerOff className="w-3 h-3 mr-1" />
          Disable
        </Button>
      )
    } else {
      buttons.push(
        <Button
          key="enable"
          size="sm"
          variant="outline"
          onClick={() => openConfirmDialog(user.id, "enable", `Are you sure you want to enable ${user.firstName} ${user.lastName}?`)}
          disabled={isLoading}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Power className="w-3 h-3 mr-1" />
          Enable
        </Button>
      )
    }

    // Admin role buttons
    if (filter === "admins" || filter === "all-users") {
      if (isAdmin) {
        buttons.push(
          <Button
            key="remove-admin"
            size="sm"
            variant="outline"
            onClick={() => openConfirmDialog(user.id, "remove-admin", `Are you sure you want to remove admin role from ${user.firstName} ${user.lastName}?`)}
            disabled={isLoading}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <UserMinus className="w-3 h-3 mr-1" />
            Remove Admin
          </Button>
        )
      } else {
        buttons.push(
          <Button
            key="add-admin"
            size="sm"
            variant="outline"
            onClick={() => openConfirmDialog(user.id, "add-admin", `Are you sure you want to make ${user.firstName} ${user.lastName} an admin?`)}
            disabled={isLoading}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <Shield className="w-3 h-3 mr-1" />
            Make Admin
          </Button>
        )
      }
    }

    // Host role buttons
    if (filter === "hosts" || filter === "tenants" || filter === "all-users") {
      if (isHost) {
        buttons.push(
          <Button
            key="remove-host"
            size="sm"
            variant="outline"
            onClick={() => openConfirmDialog(user.id, "remove-host", `Are you sure you want to remove host role from ${user.firstName} ${user.lastName}?`)}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <UserMinus className="w-3 h-3 mr-1" />
            Remove Host
          </Button>
        )
      } else if (isTenant) {
        buttons.push(
          <Button
            key="add-host"
            size="sm"
            variant="outline"
            onClick={() => openConfirmDialog(user.id, "add-host", `Are you sure you want to make ${user.firstName} ${user.lastName} a host?`)}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Building2 className="w-3 h-3 mr-1" />
            Make Host
          </Button>
        )
      }
    }

    return buttons
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="ml-3 text-gray-600">Loading users...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchUsers} variant="outline">
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
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.profilePicture ? (
                            <Image
                              src={resolveMediaUrl(user.profilePicture)}
                              alt={`${user.firstName} ${user.lastName}`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            {user.birthday && (
                              <p className="text-sm text-gray-500">
                                {new Date(user.birthday).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        {user.phoneNumber ? (
                          <p className="text-sm">{user.phoneNumber}</p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.roles)}</TableCell>
                      <TableCell>{getStatusBadge(user.enabled)}</TableCell>
                      <TableCell>
                        {user.walletAddress ? (
                          <p className="text-xs font-mono text-gray-600">
                            {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                          </p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {getActionButtons(user)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredUsers.length / itemsPerPage)}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage)
              setCurrentPage(1)
            }}
          />
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, userId: null, action: null, message: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, userId: null, action: null, message: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmDialog.userId && confirmDialog.action && handleAction(confirmDialog.userId, confirmDialog.action)}
              disabled={actionLoading[confirmDialog.userId || 0] || false}
            >
              {actionLoading[confirmDialog.userId || 0] ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

