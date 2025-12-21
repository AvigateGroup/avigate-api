// src/common/constants/legal.constants.ts

/**
 * Current versions of legal documents
 *
 * IMPORTANT: When updating these versions:
 * 1. Increment the version number
 * 2. Update the corresponding document (Terms or Privacy Policy)
 * 3. Users will be prompted to accept the new version on next app launch
 * 4. Consider sending push notifications to all users
 *
 * Version format: "MAJOR.MINOR" (e.g., "2.0", "2.1")
 */

export const CURRENT_TERMS_VERSION = '2.0';
export const CURRENT_PRIVACY_VERSION = '2.0';

/**
 * Last update dates for reference
 */
export const TERMS_LAST_UPDATED = 'November 2025';
export const PRIVACY_LAST_UPDATED = 'November 2025';

/**
 * Check if user needs to accept updated legal documents
 */
export function needsTermsUpdate(userTermsVersion: string | null): boolean {
  if (!userTermsVersion) return true;
  return userTermsVersion !== CURRENT_TERMS_VERSION;
}

export function needsPrivacyUpdate(userPrivacyVersion: string | null): boolean {
  if (!userPrivacyVersion) return true;
  return userPrivacyVersion !== CURRENT_PRIVACY_VERSION;
}

export function needsLegalUpdate(
  userTermsVersion: string | null,
  userPrivacyVersion: string | null,
): boolean {
  return needsTermsUpdate(userTermsVersion) || needsPrivacyUpdate(userPrivacyVersion);
}
