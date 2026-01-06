"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Camera, X, Eye, EyeOff, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/services/api"

export default function ProfilePage() {
  const { user, login, logout } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    birthday: "",
    walletAddress: "",
    profilePicture: "",
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const mediaBaseUrl =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    "http://localhost:8082"

  const resolveProfileImage = (url?: string | null) => {
    if (!url) return "/placeholder.jpg"
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    const relativePath = url.startsWith("/") ? url : `/${url}`

    // Prefer direct user-service base for static media, fall back to gateway/media base
    const apiMediaBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_MEDIA_BASE_URL || mediaBaseUrl
    return `${apiMediaBase}${relativePath}`
  }

  // Load user data from API on mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const userData = await apiClient.users.getMe()

        // Check if walletAddress is null, undefined, or empty string
        let walletAddress: string | null = userData.walletAddress || null
        if (walletAddress !== null && walletAddress !== undefined) {
          walletAddress = walletAddress.trim()
          if (walletAddress === "") {
            walletAddress = null
          }
        }
        setProfile({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          phoneNumber: userData.phoneNumber?.toString() || "",
          birthday: userData.birthday || "",
          walletAddress: walletAddress || "",
          profilePicture: userData.profilePicture || "",
        })
      } catch (err) {
        // Use data from auth context as fallback
        setProfile({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          birthday: user.birthday || "",
          walletAddress: "",
          profilePicture: user.profileImage || "",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveChanges = async () => {
    if (!user) return

    setIsSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      // Prepare update data
      const updateData: {
        firstName?: string
        lastName?: string
        birthday?: string
        phoneNumber?: string
        walletAddress?: string
      } = {}

      if (profile.firstName) updateData.firstName = profile.firstName
      if (profile.lastName) updateData.lastName = profile.lastName
      if (profile.birthday) updateData.birthday = profile.birthday
      if (profile.phoneNumber) {
        // Clean phone number (remove non-digits)
        const phoneDigits = profile.phoneNumber.replace(/\D/g, "")
        if (phoneDigits.length >= 10 && phoneDigits.length <= 15) {
          updateData.phoneNumber = phoneDigits
        } else {
          throw new Error("Phone number must be 10 to 15 digits")
        }
      }
      if (profile.walletAddress) {
        // Validate Ethereum address format
        if (/^0x[a-fA-F0-9]{40}$/.test(profile.walletAddress)) {
          updateData.walletAddress = profile.walletAddress
        } else {
          throw new Error("Wallet address must be a valid Ethereum address (0x followed by 40 hex characters)")
        }
      }

      await apiClient.users.updateMe(updateData)

      setSuccessMessage("Profile updated successfully!")

      // Reload user data
      const userData = await apiClient.users.getMe()
      setProfile((prev) => ({
        ...prev,
        firstName: userData.firstName || prev.firstName,
        lastName: userData.lastName || prev.lastName,
        phoneNumber: userData.phoneNumber?.toString() || prev.phoneNumber,
        birthday: userData.birthday || prev.birthday,
        profilePicture: userData.profilePicture || prev.profilePicture,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    const confirmed = window.confirm("Are you sure you want to delete your account? This cannot be undone.")
    if (!confirmed) return

    setIsSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      await apiClient.users.deleteAccount()
      // Clear auth state and redirect to homepage
      logout()
      router.push("/")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to delete account. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await apiClient.users.updateProfilePicture(formData)
      const newProfilePictureUrl = (result as any).profilePicture || (result as any).url || ""

      // Update local profile state
      setProfile((prev) => ({ ...prev, profilePicture: newProfilePictureUrl }))

      // Fetch updated user data to ensure consistency
      try {
        const userData = await apiClient.users.getMe()
        const updatedUser = {
          ...user,
          profileImage: userData.profilePicture || newProfilePictureUrl,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        localStorage.setItem("derent5_user_data", JSON.stringify(updatedUser))
        window.dispatchEvent(new Event("auth-state-changed"))
      } catch (refreshError) {
        // Fallback: update with the URL we got from upload
        const updatedUser = {
          ...user,
          profileImage: newProfilePictureUrl,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        localStorage.setItem("derent5_user_data", JSON.stringify(updatedUser))
        window.dispatchEvent(new Event("auth-state-changed"))
      }

      setSuccessMessage("Profile picture updated successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile picture. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteProfilePicture = async () => {
    if (!user) return

    if (!confirm("Are you sure you want to delete your profile picture?")) {
      return
    }

    setIsSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      await apiClient.users.deleteProfilePicture()
      setProfile((prev) => ({ ...prev, profilePicture: "" }))

      // Update user object in localStorage and auth context
      const updatedUser = {
        ...user,
        profileImage: undefined,
      }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      localStorage.setItem("derent5_user_data", JSON.stringify(updatedUser))
      window.dispatchEvent(new Event("auth-state-changed"))

      setSuccessMessage("Profile picture deleted successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete profile picture. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!user) return

    // Check if MetaMask is installed
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed. Please install MetaMask extension to connect your wallet.")
      return
    }

    setIsSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock your MetaMask wallet.")
      }

      const walletAddress = accounts[0]

      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new Error("Invalid wallet address format")
      }

      // Save wallet address to backend
      await apiClient.users.updateMe({ walletAddress })

      // Update local state
      setProfile((prev) => ({ ...prev, walletAddress }))
      setSuccessMessage("Wallet connected successfully!")

      // Reload user data to get updated wallet address
      const userData = await apiClient.users.getMe()
      setProfile((prev) => ({
        ...prev,
        walletAddress: userData.walletAddress || walletAddress,
      }))
    } catch (err: any) {
      if (err.code === 4001) {
        setError("Connection rejected. Please approve the connection request in MetaMask.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to connect wallet. Please try again.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnectWallet = async () => {
    if (!user) return

    if (!confirm("Are you sure you want to disconnect your wallet?")) {
      return
    }

    setIsSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      // Remove wallet address by setting it to empty string (will be converted to null in backend)
      await apiClient.users.updateMe({ walletAddress: "" })

      // Update local state
      setProfile((prev) => ({ ...prev, walletAddress: "" }))
      setSuccessMessage("Wallet disconnected successfully!")

      // Reload user data to confirm deletion
      const userData = await apiClient.users.getMe()
      setProfile((prev) => ({
        ...prev,
        walletAddress: userData.walletAddress || "",
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect wallet. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Please sign in to view your profile</p>
          <Link href="/login">
            <Button className="bg-teal-600 hover:bg-teal-700">Sign In</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <p className="text-gray-600">Loading profile...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Profile</h1>
        </div>

        <div className="space-y-8">
          {/* Profile Picture */}
          <Card className="p-8 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.profilePicture ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-teal-600">
                    <Image
                      src={resolveProfileImage(profile.profilePicture)}
                      alt={`${user.firstName} ${user.lastName}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                    {user.firstName?.charAt(0) || user.lastName?.charAt(0) || "A"}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="mt-4 flex gap-2">
                  <label className="cursor-pointer">
                    <Button type="button" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md transition-all" asChild>
                      <span>Change profile picture</span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </label>
                  {profile.profilePicture && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeleteProfilePicture}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">{successMessage}</div>
          )}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          {/* Personal Information */}
          <Card className="p-8 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={profile.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="212612345678"
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                <p className="text-sm text-gray-500 mt-1">10-15 digits only</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={profile.birthday}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveChanges}
              className="mt-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </Card>

          {/* Security */}
          <Card className="p-8 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Security</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all"
                >
                  Change password
                </Button>
              </div>
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-8 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment</h2>
            {(() => {
              // Simple check: if walletAddress is null, undefined, or empty string, show connect button
              const walletAddr = profile.walletAddress
              // Check if walletAddress is null, undefined, or empty (after trimming)
              const hasWallet = walletAddr != null && walletAddr !== undefined && walletAddr.trim() !== ""
              return !hasWallet
            })() ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your MetaMask wallet to enable cryptocurrency payments
                </p>
                <Button
                  onClick={handleConnectWallet}
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={isSaving}
                >
                  {isSaving ? "Connecting..." : "Connect Wallet"}
                </Button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    value={profile.walletAddress}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                  <Button
                    onClick={handleDisconnectWallet}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    disabled={isSaving}
                  >
                    {isSaving ? "Disconnecting..." : "Disconnect Wallet"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Your wallet is connected. You can use it for cryptocurrency payments.
                </p>
              </div>
            )}
          </Card>

          {/* Danger Zone */}
          <Card className="p-8 bg-red-50/50 backdrop-blur-md border border-red-200 shadow-sm">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
            <p className="text-gray-600 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            {profile.profilePicture && (
              <Button
                variant="outline"
                onClick={handleDeleteProfilePicture}
                className="border-red-600 text-red-600 hover:bg-red-50"
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete profile picture"}
              </Button>
            )}
            <div className="mt-4">
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Deleting account..." : "Delete account"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Change Password Modal */}
      <Dialog open={changePasswordModalOpen} onOpenChange={setChangePasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setError("")

              if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                setError("Please fill in all fields")
                return
              }

              if (passwordData.newPassword !== passwordData.confirmPassword) {
                setError("New passwords do not match")
                return
              }

              // Validate password format
              const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,20}$/
              if (!passwordRegex.test(passwordData.newPassword)) {
                setError(
                  "Password must be 8-20 characters long and include at least one uppercase letter, " +
                  "one lowercase letter, one number, and one special character (@#$%^&+=!)"
                )
                return
              }

              setIsChangingPassword(true)
              setError("")

              try {
                await apiClient.users.changePassword(passwordData.currentPassword, passwordData.newPassword)
                setSuccessMessage("Password changed successfully!")
                setChangePasswordModalOpen(false)
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                })
                setTimeout(() => setSuccessMessage(""), 3000)
              } catch (err: any) {
                setError(err.message || "Failed to change password. Please check your current password and try again.")
              } finally {
                setIsChangingPassword(false)
              }
            }}
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                8-20 characters, include uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setChangePasswordModalOpen(false)
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                  setError("")
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

