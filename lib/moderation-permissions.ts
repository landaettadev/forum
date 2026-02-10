// Moderation Permissions System
// Defines what each role can do

export type ModeratorType = 'super' | 'basic' | 'country' | null;
export type UserRole = 'admin' | 'mod' | 'user';

export interface ModeratorPermissions {
  canDeletePosts: boolean;
  canDeleteThreads: boolean;
  canEditPosts: boolean;
  canEditThreads: boolean;
  canLockThreads: boolean;
  canPinThreads: boolean;
  canSendWarnings: boolean;
  canSuspendTemporary: boolean;
  canSuspendPermanent: boolean;
  canBanIP: boolean;
  canSuperBan: boolean;
  canManageFilters: boolean;
  canManageReports: boolean;
  canPromoteMods: boolean;
  canViewModLogs: boolean;
  canAssignCountryMods: boolean;
  countryRestricted: boolean;
}

export function getModeratorPermissions(
  role: UserRole,
  moderatorType: ModeratorType
): ModeratorPermissions {
  // Admin has full access
  if (role === 'admin') {
    return {
      canDeletePosts: true,
      canDeleteThreads: true,
      canEditPosts: true,
      canEditThreads: true,
      canLockThreads: true,
      canPinThreads: true,
      canSendWarnings: true,
      canSuspendTemporary: true,
      canSuspendPermanent: true,
      canBanIP: true,
      canSuperBan: true,
      canManageFilters: true,
      canManageReports: true,
      canPromoteMods: true,
      canViewModLogs: true,
      canAssignCountryMods: true,
      countryRestricted: false,
    };
  }

  // Super Moderator
  if (role === 'mod' && moderatorType === 'super') {
    return {
      canDeletePosts: true,
      canDeleteThreads: true,
      canEditPosts: true,
      canEditThreads: true,
      canLockThreads: true,
      canPinThreads: true,
      canSendWarnings: true,
      canSuspendTemporary: true,
      canSuspendPermanent: true,
      canBanIP: true,
      canSuperBan: false, // Only admin
      canManageFilters: true,
      canManageReports: true,
      canPromoteMods: false, // Only admin
      canViewModLogs: true,
      canAssignCountryMods: false, // Only admin
      countryRestricted: false,
    };
  }

  // Basic Moderator
  if (role === 'mod' && (moderatorType === 'basic' || moderatorType === null)) {
    return {
      canDeletePosts: true,
      canDeleteThreads: false,
      canEditPosts: true,
      canEditThreads: false,
      canLockThreads: false,
      canPinThreads: false,
      canSendWarnings: true,
      canSuspendTemporary: false,
      canSuspendPermanent: false,
      canBanIP: false,
      canSuperBan: false,
      canManageFilters: false,
      canManageReports: true,
      canPromoteMods: false,
      canViewModLogs: true,
      canAssignCountryMods: false,
      countryRestricted: false,
    };
  }

  // Country Moderator
  if (role === 'mod' && moderatorType === 'country') {
    return {
      canDeletePosts: true,
      canDeleteThreads: false,
      canEditPosts: true,
      canEditThreads: false,
      canLockThreads: false,
      canPinThreads: false,
      canSendWarnings: true,
      canSuspendTemporary: false,
      canSuspendPermanent: false,
      canBanIP: false,
      canSuperBan: false,
      canManageFilters: false,
      canManageReports: true,
      canPromoteMods: false,
      canViewModLogs: true,
      canAssignCountryMods: false,
      countryRestricted: true, // Can only moderate assigned countries
    };
  }

  // Regular user - no permissions
  return {
    canDeletePosts: false,
    canDeleteThreads: false,
    canEditPosts: false,
    canEditThreads: false,
    canLockThreads: false,
    canPinThreads: false,
    canSendWarnings: false,
    canSuspendTemporary: false,
    canSuspendPermanent: false,
    canBanIP: false,
    canSuperBan: false,
    canManageFilters: false,
    canManageReports: false,
    canPromoteMods: false,
    canViewModLogs: false,
    canAssignCountryMods: false,
    countryRestricted: false,
  };
}

export function canModerateUser(
  moderatorRole: UserRole,
  moderatorType: ModeratorType,
  targetRole: UserRole,
  targetModeratorType: ModeratorType
): boolean {
  // Admin can moderate everyone
  if (moderatorRole === 'admin') return true;

  // Super mod can moderate basic mods, country mods, and users
  if (moderatorType === 'super') {
    if (targetRole === 'admin') return false;
    if (targetModeratorType === 'super') return false;
    return true;
  }

  // Basic and country mods can only moderate regular users
  if (moderatorRole === 'mod') {
    return targetRole === 'user';
  }

  return false;
}

export function getModeratorTypeLabel(type: ModeratorType): string {
  switch (type) {
    case 'super': return 'Super Moderador';
    case 'basic': return 'Moderador';
    case 'country': return 'Moderador de País';
    default: return 'Usuario';
  }
}
