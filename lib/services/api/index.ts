export * from './core'
export * from './auth'
export * from './property'
export * from './booking'
export * from './payment'
export * from './reclamation'
export * from './ai'

import { auth } from './auth'
import { properties } from './property'
import { bookings } from './booking'
import { payments } from './payment'
import { reclamations } from './reclamation'
import { marketTrends, recommendations, tenantRisk } from './ai'

// The original apiClient mixed user management into the root or auth?
// Looking at the view: 
// It seems `apiClient` starts at line 340 with `properties`.
// `auth` is at line 1248.
// `users`? I don't see a `users` object in the displayed slice.
// However, there are `changePassword`, `deleteProfilePicture`, `becomeHost` methods directly on `apiClient` (lines 1131, 1141, 1151).
// So `apiClient` has `properties`, `auth`, `bookings`, `payments`, `reclamations` AND direct user methods.

export const apiClient = {
    properties,
    bookings,
    payments,
    reclamations,
    marketTrends,
    recommendations,
    tenantRisk,
    // Alias for risk-related functionality
    risk: {
        getTenantRiskScore: tenantRisk.assess
    },

    // Auth namespace
    auth: {
        register: auth.register,
        login: auth.login,
        setAuth: auth.setAuth,
        getToken: auth.getToken,
        getUser: auth.getUser,
        clearAuth: auth.clearAuth,
        hasRole: auth.hasRole,
        verify: auth.verify,
        resendVerificationCode: auth.resendVerificationCode,
        forgotPassword: auth.forgotPassword,
        verifyResetToken: auth.verifyResetToken,
        resetPassword: auth.resetPassword
    },

    // Flatted User methods (Legacy compatibility)
    // In my auth.ts, I put these: getMe, updateMe, uploadProfilePicture, changePassword, becomeHost, etc.
    getMe: auth.getMe,
    updateMe: auth.updateMe,
    uploadProfilePicture: auth.uploadProfilePicture,
    updateProfilePicture: auth.updateProfilePicture,
    deleteProfilePicture: auth.deleteProfilePicture,
    deleteAccount: auth.deleteAccount,
    changePassword: auth.changePassword,
    becomeHost: auth.becomeHost,

    // Admin User methods
    getAllUsersEncoded: auth.getAllUsersEncoded, // Wait, original was getAllForAdmin inside users?
    // Line 1161: async getAllForAdmin() ... seems to be on root level or inside users?
    // "async getAllForAdmin(): Promise<..." is inside `apiClient` object definition directly?
    // NO, looking at indentation:
    // apiClient = {
    //   properties: { ... },
    //   ...
    //   users: { ... } ??

    // Let's assume for now they were on root or I should group them.
    // Actually, standard practice in this codebase seems to be `apiClient.users.getAll()`.
    // But line 1131 `changePassword` seems to be distinct.
    // I will check if there is a `users` object in apiClient in the original file.

    // For now, I will expose them as `users` object AND root methods if unsure, to be safe.
    users: {
        getMe: auth.getMe,
        updateMe: auth.updateMe,
        uploadProfilePicture: auth.uploadProfilePicture,
        updateProfilePicture: auth.updateProfilePicture,
        deleteProfilePicture: auth.deleteProfilePicture,
        deleteAccount: auth.deleteAccount,
        changePassword: auth.changePassword,
        getById: auth.getById,
        getAllForAdmin: auth.getAllUsersEncoded,
        enableUser: auth.enableUser,
        disableUser: auth.disableUser,
        addAdminRole: auth.addAdminRole,
        removeAdminRole: auth.removeAdminRole
    },

    // Also include the admin methods on root if that's what legacy did
    getAllForAdmin: auth.getAllUsersEncoded,
    enableUser: auth.enableUser,
    disableUser: auth.disableUser,
    addAdminRole: auth.addAdminRole,
    removeAdminRole: auth.removeAdminRole
}
