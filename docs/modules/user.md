# User Module

The User Module manages user profiles, account settings, device management, and account lifecycle for the Avigate platform.

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Services](#services)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Overview

The User Module provides comprehensive user account management capabilities, including profile updates, device tracking, statistics, and account deletion.

### Key Responsibilities

- User profile management
- Profile picture uploads
- Email change with re-verification
- Device tracking and management
- User statistics and analytics
- Account deletion

## Features

### 👤 Profile Management

- Update personal information (name, phone, country, language)
- Change email with re-verification
- Upload profile pictures
- Track profile completion

### 📱 Device Management

- View all registered devices
- Track device activity
- Deactivate specific devices
- FCM token management

### 📊 User Statistics

- Account creation date
- Last login tracking
- Total devices count
- Active devices count
- OTP usage statistics
- Reputation score
- Contribution metrics

### 🗑️ Account Management

- Secure account deletion
- Confirmation requirements
- Cascade deletion of related data
- Final confirmation email

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/profile` | Required | Get user profile |
| PUT | `/users/profile` | Required | Update profile |
| POST | `/users/profile/picture` | Required | Upload profile picture |
| GET | `/users/devices` | Required | Get user devices |
| DELETE | `/users/devices/:deviceId` | Required | Deactivate device |
| GET | `/users/stats` | Required | Get user statistics |
| DELETE | `/users/account` | Required | Delete account |

## Services

### UserService

Main service for user account operations.

**Key Methods:**

```typescript
// Profile Management
getProfile(user: User)
updateProfile(user: User, updateDto: UpdateProfileDto)
uploadProfilePicture(user: User, file: Express.Multer.File)

// Device Management
getUserDevices(user: User)
deactivateDevice(user: User, deviceId: string)

// Statistics
getUserStats(user: User)

// Account Management
deleteAccount(user: User, confirmDelete: string)
```

### Profile Update Process

When a user updates their profile:

1. **Validate Changes**
   - Check phone number uniqueness
   - Check email uniqueness

2. **Update Fields**
   - Update allowed fields
   - Track changed fields

3. **Handle Email Changes**
   - Mark user as unverified
   - Send notification to old email
   - Send verification OTP to new email
   - User must verify new email

4. **Send Notifications**
   - Email notification for profile changes
   - List of updated fields

### Profile Picture Upload

**Process:**
1. Validate file upload
2. Delete old profile picture (if exists)
3. Upload to AWS S3
4. Update user record
5. Send notification email
6. Return new picture URL

**Supported Formats:**
- JPEG
- PNG
- WebP
- GIF

**File Size Limit:** 5MB (recommended)

### Device Management

**Device Information:**
```typescript
{
  id: string;
  userId: string;
  fcmToken: string;
  deviceFingerprint: string;
  deviceInfo: string;
  ipAddress: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}
```

**Operations:**
- View all registered devices
- See last active time
- Deactivate specific devices
- Track device usage

### Account Deletion

**Requirements:**
1. Confirmation string: `"DELETE_MY_ACCOUNT"`
2. Cannot be undone

**Cascade Deletion:**
- User devices
- User OTPs
- Profile picture (from AWS S3)
- User account record

**Exceptions:**
- Test accounts: Skip  verification
- Google OAuth: Skip verification

## Usage Examples

### Get User Profile

```typescript
GET /api/v1/users/profile
Authorization: Bearer {ACCESS_TOKEN}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+2348012345678",
      "sex": "male",
      "country": "Nigeria",
      "language": "English",
      "profilePicture": "https://avigate-uploads.s3.amazonaws.com/.../profile.jpg",
      "isVerified": true,
      "isActive": true,
      "authProvider": "local",
      "reputationScore": 0,
      "totalContributions": 0,
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Update Profile

```typescript
PUT /api/v1/users/profile
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+2348098765432",
  "country": "Nigeria",
  "language": "English"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phoneNumber": "+2348098765432",
      // ... other fields
    }
  }
}

// Email notification sent with updated fields:
// - firstName
// - lastName
// - phoneNumber
```

### Change Email Address

```typescript
PUT /api/v1/users/profile
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "email": "newemail@example.com"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully. A verification code has been sent to your new email address.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "newemail@example.com",
      "isVerified": false,  // Requires re-verification
      // ... other fields
    }
  }
}

// Two emails sent:
// 1. Notification to old email (oldemail@example.com)
// 2. Verification OTP to new email (newemail@example.com)

// User must verify new email:
POST /api/v1/auth/verify-email
{
  "email": "newemail@example.com",
  "otpCode": "123456"
}
```

### Upload Profile Picture

```typescript
POST /api/v1/users/profile/picture
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: multipart/form-data

FormData:
  file: [image file]

// Response
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profilePicture": "https://avigate-uploads.s3.amazonaws.com/"
  }
}

// Old profile picture deleted from AWS S3
// Notification email sent
```

### Get User Devices

```typescript
GET /api/v1/users/devices
Authorization: Bearer {ACCESS_TOKEN}

// Response
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "device-uuid-1",
        "deviceInfo": "iPhone 13 - iOS 16",
        "ipAddress": "197.210.x.x",
        "isActive": true,
        "lastActiveAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "device-uuid-2",
        "deviceInfo": "Samsung Galaxy S21 - Android 12",
        "ipAddress": "197.210.x.x",
        "isActive": true,
        "lastActiveAt": "2024-01-14T15:20:00Z",
        "createdAt": "2024-01-10T00:00:00Z"
      }
    ]
  }
}
```

### Deactivate Device

```typescript
DELETE /api/v1/users/devices/device-uuid-2
Authorization: Bearer {ACCESS_TOKEN}

// Response
{
  "success": true,
  "message": "Device deactivated successfully"
}

// Device is marked as inactive
// FCM notifications will no longer be sent to this device
```

### Get User Statistics

```typescript
GET /api/v1/users/stats
Authorization: Bearer {ACCESS_TOKEN}

// Response
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "isVerified": true,
    "isTestAccount": false,
    "memberSince": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-15T10:30:00Z",
    "reputationScore": 0,
    "totalContributions": 0,
    "totalDevices": 2,
    "activeDevices": 1,
    "totalOTPs": 5,
    "usedOTPs": 5
  }
}
```

### Delete Account

```typescript
DELETE /api/v1/users/account
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "confirmDelete": "DELETE_MY_ACCOUNT"
}

// Response
{
  "success": true,
  "message": "Account deleted successfully"
}

// Following data is deleted:
// - All user devices
// - All user OTPs
// - Profile picture (from AWS S3)
// - User account record

// Confirmation email sent to user
```

## DTOs

### UpdateProfileDto

```typescript
{
  firstName?: string;      // Min 2, Max 50 chars
  lastName?: string;       // Min 2, Max 50 chars
  email?: string;          // Valid email, triggers re-verification
  sex?: 'male' | 'female'; // Optional
  phoneNumber?: string;    // E.164 format recommended
  country?: string;        // Default: 'Nigeria'
  language?: string;       // Default: 'English'
}
```

### UploadFileDto

```typescript
{
  file: File;  // Image file (JPEG, PNG, WebP, GIF)
}
```

### DeleteAccountDto

```typescript
{
  confirmDelete: string;    // Must be "DELETE_MY_ACCOUNT"
}
```

## Email Notifications

### Profile Update Notification

Sent when profile fields are updated.

**Template:**
```
Subject: Profile Updated - Avigate

Hi {firstName},

Your Avigate profile has been updated. The following information was changed:

- First Name
- Phone Number
- Country

If you didn't make these changes, please contact support immediately.

Best regards,
Avigate Team
```

### Email Change Notifications

**To Old Email:**
```
Subject: Email Address Changed - Avigate

Hi {firstName},

Your Avigate account email has been changed from {oldEmail} to {newEmail}.

If you didn't make this change, please contact support immediately.

Best regards,
Avigate Team
```

**To New Email:**
```
Subject: Verify Your New Email - Avigate

Hi {firstName},

Please verify your new email address using this code:

{otpCode}

This code expires in 10 minutes.

Best regards,
Avigate Team
```

### Account Deletion Confirmation

```
Subject: Account Deleted - Avigate

Hi {firstName},

Your Avigate account has been permanently deleted on {timestamp}.

All your data has been removed from our systems.

If you didn't request this deletion, please contact support immediately.

Thank you for being part of Avigate.

Best regards,
Avigate Team
```

## Security Considerations

### Profile Updates

1. **Email Changes**
   - User must verify new email
   - Notification sent to old email
   - Account marked as unverified until confirmed

2. **Phone Number Changes**
   - Check uniqueness
   - Update all related records
   - Send confirmation notification


### Device Management

1. **Device Tracking**
   - Fingerprint-based identification
   - IP address logging
   - Last activity tracking

2. **Device Deactivation**
   - Only device owner can deactivate
   - Stops FCM notifications
   - Can be reactivated on next login

### Account Deletion

1. **Verification**
   - Confirmation string required
   - Cannot be undone

2. **Data Removal**
   - Cascade delete related records
   - Remove from cloud storage
   - Send confirmation email

## Error Handling

Common error scenarios:

```typescript
// Phone number already in use
{
  "statusCode": 409,
  "message": "Phone number is already in use",
  "error": "Conflict"
}

// Email already in use
{
  "statusCode": 409,
  "message": "Email is already in use",
  "error": "Conflict"
}

// Device not found
{
  "statusCode": 404,
  "message": "Device not found",
  "error": "Not Found"
}

// Invalid file upload
{
  "statusCode": 400,
  "message": "No file uploaded",
  "error": "Bad Request"
}


// Invalid confirmation string
{
  "statusCode": 400,
  "message": "Please confirm account deletion by sending \"DELETE_MY_ACCOUNT\"",
  "error": "Bad Request"
}
```

## Best Practices

### For Frontend Developers

1. **Profile Updates**
   - Show loading states
   - Confirm email changes
   - Validate inputs before submission
   - Handle verification flow

2. **Image Uploads**
   - Compress images before upload
   - Show upload progress
   - Preview before upload
   - Handle large files gracefully

3. **Device Management**
   - Show clear device information
   - Confirm before deactivation
   - Refresh list after changes

4. **Account Deletion**
   - Show strong warning
   - Require multiple confirmations
   - Explain consequences clearly
   - Provide account recovery info

### For Backend Developers

1. **Data Validation**
   - Validate all inputs
   - Check uniqueness constraints
   - Sanitize user inputs
   - Use DTOs for type safety

2. **Email Handling**
   - Use background jobs
   - Handle failures gracefully
   - Log email status
   - Implement retry logic

3. **File Management**
   - Validate file types
   - Check file sizes
   - Clean up old files
   - Use CDN for delivery

4. **Performance**
   - Use indexes on frequently queried fields
   - Implement pagination
   - Cache user profiles
   - Optimize image delivery

## Related Documentation

- [Auth Module](./auth.md) - User authentication
- [Admin Module](./admin.md) - Admin operations
- [Email Module](./email.md) - Email notifications
- [Upload Module](./upload.md) - File uploads
- [Database Schema](../database.md) - Database structure

---

[← Back to Main README](../../README.md)