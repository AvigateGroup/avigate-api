# Admin Module

The Admin Module provides comprehensive authentication, management, and analytics capabilities for administrators of the Avigate platform.

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Controllers](#controllers)
- [Services](#services)
- [DTOs](#dtos)
- [Security](#security)
- [API Endpoints](#api-endpoints)

## Overview

The Admin Module is a secure, feature-rich system for managing the Avigate platform. It includes role-based access control, two-factor authentication, session management, and comprehensive admin operations.

### Key Responsibilities

- Admin authentication with enhanced security
- Role-based access control (RBAC)
- Admin account management (CRUD operations)
- User management from admin panel
- Session management and tracking
- Analytics and reporting
- TOTP-based 2FA
- Password management

## Features

### 🔐 Authentication & Security

- **Domain-Restricted Access**: Only @avigate.co emails allowed
- **Two-Factor Authentication**: Optional TOTP with backup codes
- **Session Management**: IP tracking, device fingerprinting
- **Account Lockout**: 5 failed attempts = 30min lockout
- **Password Requirements**: 12+ chars with complexity rules
- **Password History**: Prevents reuse of recent passwords
- **Invitation System**: Secure onboarding for new admins

### 👥 Role-Based Access Control

**Available Roles:**

| Role | Permissions | Description |
|------|------------|-------------|
| **SUPER_ADMIN** | All permissions | Full system access |
| **ADMIN** | Standard admin permissions | Can manage users, view analytics |
| **MODERATOR** | Limited permissions | Can moderate content |
| **SUPPORT** | Read-only + support | Can view and assist users |

**Permission Categories:**
- `admins.*` - Admin management
- `users.*` - User management  
- `analytics.*` - View reports
- `content.*` - Content moderation

### 📊 User Management

Admins can:
- View all registered users with filters
- Search users by name/email
- Update user verification status
- Activate/deactivate user accounts
- Delete user accounts with reason tracking
- View user statistics and devices

## Controllers

### 1. AdminAuthController

**Path:** `/api/v1/admin/auth`

Handles admin authentication, password management, and TOTP setup.

**Key Endpoints:**

```typescript
POST   /login              # Login with optional 2FA
POST   /logout             # Logout current session
POST   /refresh            # Refresh access token
GET    /me                 # Get current admin profile
POST   /password/request-reset  # Request password reset
POST   /password/reset     # Reset password with token
POST   /password/change    # Change password (authenticated)
POST   /invitation/accept  # Accept admin invitation
POST   /totp/generate-secret    # Generate TOTP secret (Step 1)
POST   /totp/enable        # Enable TOTP (Step 2)
POST   /totp/disable       # Disable TOTP
GET    /totp/status        # Get TOTP status
POST   /totp/regenerate-backup-codes  # Regenerate backup codes
```

### 2. AdminManagementController

**Path:** `/api/v1/admin/management`

Admin CRUD operations and session management.

**Key Endpoints:**

```typescript
POST   /create             # Create new admin (Super Admin only)
GET    /                   # List all admins with filters
GET    /roles/permissions  # Get available roles & permissions
GET    /:adminId           # Get specific admin
PUT    /:adminId           # Update admin
DELETE /:adminId           # Soft delete admin
PUT    /:adminId/restore   # Restore deleted admin
PUT    /:adminId/activate  # Activate/deactivate admin
POST   /:adminId/reset-password  # Reset admin password
GET    /:adminId/sessions  # Get admin sessions
DELETE /:adminId/sessions  # Revoke all sessions
DELETE /:adminId/sessions/:sessionId  # Revoke specific session
```

### 3. UserManagementController

**Path:** `/api/v1/admin/users`

User management from admin panel.

**Key Endpoints:**

```typescript
GET    /                   # List all users with filters
GET    /:userId            # Get user details
PUT    /:userId/status     # Update user status
DELETE /:userId            # Delete user account
GET    /stats/overview     # Get user statistics
```

### 4. AnalyticsController

**Path:** `/api/v1/admin/analytics`

Platform analytics and metrics.

**Key Endpoints:**

```typescript
GET    /dashboard          # Dashboard overview
GET    /user-growth        # User growth metrics
```

## Services

### AdminAuthService

Core authentication logic with session management.

**Key Methods:**

```typescript
login(loginDto, req, res)              // Login with optional TOTP
logout(admin, sessionId, res)          // Logout and invalidate session
refreshToken(refreshToken, req, res)   // Refresh access token
getProfile(admin)                      // Get admin profile
```

**Authentication Flow:**

```
1. Validate email domain (@avigate.co)
2. Find admin account
3. Check if account is active
4. Check if account is locked
5. Verify password
6. If TOTP enabled, verify token or backup code
7. Create session
8. Generate JWT tokens
9. Set refresh token cookie
10. Update login info
```

### AdminCrudService

Admin account CRUD operations.

**Key Methods:**

```typescript
createAdmin(dto, currentAdmin)         // Create admin with invitation
getAdmins(page, limit, filters)        // List admins with pagination
getAdminById(adminId)                  // Get single admin
updateAdmin(adminId, dto, currentAdmin) // Update admin
deleteAdmin(adminId, currentAdmin)     // Soft delete admin
restoreAdmin(adminId, currentAdmin)    // Restore deleted admin
```

### AdminTotpService

Two-factor authentication management.

**Key Methods:**

```typescript
generateSecret(admin)                  // Generate TOTP secret & QR code
enableTotp(admin, totpToken)           // Enable TOTP
disableTotp(admin, password, token)    // Disable TOTP
verifyTotp(admin, token)               // Verify TOTP token
regenerateBackupCodes(admin, ...)      // Regenerate backup codes
getTotpStatus(admin)                   // Get TOTP status
```

**TOTP Setup Flow:**

```
1. Admin calls /totp/generate-secret
2. Service generates secret & backup codes
3. Returns QR code URI for authenticator app
4. Admin scans QR code in Google Authenticator
5. Admin calls /totp/enable with first TOTP token
6. Service verifies token and enables 2FA
7. Admin saves backup codes securely
```

### AdminPasswordService

Password management including resets and changes.

**Key Methods:**

```typescript
requestPasswordReset(email)            // Send reset token via email
resetPassword(token, newPass, confirm) // Reset with token
changePassword(admin, current, new, confirm) // Change password
resetAdminPassword(adminId, sendEmail) // Admin reset by Super Admin
```

### AdminInvitationService

Secure admin onboarding.

**Key Methods:**

```typescript
acceptInvitation(dto)                  // Accept invitation & set password
```

**Invitation Flow:**

```
1. Super Admin creates new admin account
2. System generates invitation token (7-day expiry)
3. Email sent to new admin with invitation link
4. Admin clicks link and sets their first password
5. Account activated and ready to use
```

### AdminSessionService

Session lifecycle management.

**Key Methods:**

```typescript
getAdminSessions(adminId)              // Get active sessions
revokeSession(sessionId, currentAdmin) // Revoke specific session
revokeAllSessions(adminId, currentAdmin) // Revoke all sessions
cleanupExpiredSessions()               // Background cleanup
```

### AdminStatusService

Account activation/deactivation.

**Key Methods:**

```typescript
toggleAdminStatus(adminId, isActive, currentAdmin) // Toggle status
```

### AdminPermissionService

Permission checking and role management.

**Key Methods:**

```typescript
getRolePermissions(role)               // Get permissions for role
getRolesAndPermissions()               // Get all roles & permissions
hasPermission(admin, permission)       // Check permission
```

### AnalyticsService

Platform metrics and reporting.

**Key Methods:**

```typescript
getDashboardOverview(period)           // Dashboard metrics
getUserGrowthMetrics(period, interval) // User growth trends
```

## DTOs

### Authentication DTOs

**AdminLoginDto**
```typescript
{
  email: string;          // Must be @avigate.co
  password: string;
  totpToken?: string;     // Optional if 2FA enabled
  backupCode?: string;    // Alternative to TOTP
}
```

**ChangePasswordDto**
```typescript
{
  currentPassword: string;
  newPassword: string;    // 12+ chars, complexity required
  confirmPassword: string;
}
```

**AcceptInvitationDto**
```typescript
{
  token: string;          // Invitation token
  newPassword: string;
  confirmPassword: string;
}
```

### Management DTOs

**CreateAdminDto**
```typescript
{
  email: string;          // Must be @avigate.co
  firstName: string;
  lastName: string;
  role?: AdminRole;       // Default: ADMIN
}
```

**UpdateAdminDto**
```typescript
{
  firstName?: string;
  lastName?: string;
  role?: AdminRole;       // Super Admin only
  permissions?: string[]; // Super Admin only
  isActive?: boolean;
}
```

**ToggleStatusDto**
```typescript
{
  isActive: boolean;
}
```

### TOTP DTOs

**VerifyTotpDto**
```typescript
{
  totpToken: string;      // 6-digit code
}
```

**DisableTotpDto**
```typescript
{
  currentPassword: string;
  totpToken: string;
}
```

**RegenerateBackupCodesDto**
```typescript
{
  currentPassword: string;
  totpToken: string;
}
```

## Security

### Password Requirements

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot match last 5 passwords

### Account Lockout

```typescript
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
```

After 5 failed login attempts, the account is locked for 30 minutes.

### Session Security

- JWT access tokens (1 hour expiration)
- Refresh tokens stored as HTTP-only cookies
- Refresh tokens expire after 7 days
- IP address tracking per session
- Device fingerprinting
- Session revocation on logout

### TOTP Configuration

```typescript
const TOTP_WINDOW = 1;              // Allow 1 step before/after
const TOTP_PERIOD = 30;             // 30-second periods
const BACKUP_CODES_COUNT = 10;      // Generate 10 backup codes
```

## API Endpoints

### Complete Endpoint List

#### Authentication

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/admin/auth/login` | Public | - | Admin login |
| POST | `/admin/auth/logout` | Required | - | Logout |
| POST | `/admin/auth/refresh` | Cookie | - | Refresh token |
| GET | `/admin/auth/me` | Required | - | Get profile |
| POST | `/admin/auth/password/request-reset` | Public | - | Request reset |
| POST | `/admin/auth/password/reset` | Public | - | Reset password |
| POST | `/admin/auth/password/change` | Required | - | Change password |
| POST | `/admin/auth/invitation/accept` | Public | - | Accept invitation |
| POST | `/admin/auth/totp/generate-secret` | Required | - | Generate TOTP secret |
| POST | `/admin/auth/totp/enable` | Required | - | Enable TOTP |
| POST | `/admin/auth/totp/disable` | Required | - | Disable TOTP |
| GET | `/admin/auth/totp/status` | Required | - | Get TOTP status |
| POST | `/admin/auth/totp/regenerate-backup-codes` | Required | - | Regenerate codes |

#### Admin Management

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/admin/management/create` | Required | `admins.create` | Create admin |
| GET | `/admin/management` | Required | `admins.view` | List admins |
| GET | `/admin/management/roles/permissions` | Required | `admins.view` | Get roles |
| GET | `/admin/management/:adminId` | Required | `admins.view` | Get admin |
| PUT | `/admin/management/:adminId` | Required | `admins.edit` | Update admin |
| DELETE | `/admin/management/:adminId` | Required | `admins.delete` | Delete admin |
| PUT | `/admin/management/:adminId/restore` | Required | `admins.edit` | Restore admin |
| PUT | `/admin/management/:adminId/activate` | Required | `admins.edit` | Toggle status |
| POST | `/admin/management/:adminId/reset-password` | Required | `admins.edit` | Reset password |
| GET | `/admin/management/:adminId/sessions` | Required | `admins.view` | Get sessions |
| DELETE | `/admin/management/:adminId/sessions` | Required | `admins.edit` | Revoke all sessions |
| DELETE | `/admin/management/:adminId/sessions/:sessionId` | Required | `admins.edit` | Revoke session |

#### User Management

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/admin/users` | Required | `users.view` | List users |
| GET | `/admin/users/:userId` | Required | `users.view` | Get user |
| PUT | `/admin/users/:userId/status` | Required | `users.edit` | Update status |
| DELETE | `/admin/users/:userId` | Required | `users.delete` | Delete user |
| GET | `/admin/users/stats/overview` | Required | `analytics.view` | User stats |

#### Analytics

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/admin/analytics/dashboard` | Required | `analytics.view` | Dashboard |
| GET | `/admin/analytics/user-growth` | Required | `analytics.view` | User growth |

## Usage Examples

### Creating a New Admin

```typescript
// Step 1: Super Admin creates account
POST /api/v1/admin/management/create
Authorization: Bearer {SUPER_ADMIN_TOKEN}

{
  "email": "newadmin@avigate.co",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "ADMIN"
}

// Response includes invitation token
{
  "success": true,
  "message": "Admin created successfully. Invitation email sent.",
  "data": {
    "admin": {...},
    "invitationToken": "abc123..."
  }
}

// Step 2: New admin accepts invitation
POST /api/v1/admin/auth/invitation/accept

{
  "token": "abc123...",
  "newPassword": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

### Setting Up 2FA

```typescript
// Step 1: Generate TOTP secret
POST /api/v1/admin/auth/totp/generate-secret
Authorization: Bearer {ADMIN_TOKEN}

// Response
{
  "success": true,
  "data": {
    "qrCodeUri": "otpauth://totp/...",
    "secret": "BASE32SECRET",
    "backupCodes": [
      "ABCD-1234",
      "EFGH-5678",
      // ... 10 codes total
    ]
  }
}

// Step 2: Scan QR code in Google Authenticator

// Step 3: Enable TOTP with first code
POST /api/v1/admin/auth/totp/enable
Authorization: Bearer {ADMIN_TOKEN}

{
  "totpToken": "123456"
}

// Step 4: Save backup codes securely!
```

### Admin Login with 2FA

```typescript
POST /api/v1/admin/auth/login

{
  "email": "admin@avigate.co",
  "password": "YourPassword123!",
  "totpToken": "123456"  // From authenticator app
}

// Or using backup code
{
  "email": "admin@avigate.co",
  "password": "YourPassword123!",
  "backupCode": "ABCD-1234"
}
```

### Managing User Accounts

```typescript
// List users with filters
GET /api/v1/admin/users?page=1&limit=20&search=john&isVerified=true
Authorization: Bearer {ADMIN_TOKEN}

// Deactivate user
PUT /api/v1/admin/users/user-uuid/status
Authorization: Bearer {ADMIN_TOKEN}

{
  "isActive": false,
  "reason": "Suspicious activity"
}

// Delete user account
DELETE /api/v1/admin/users/user-uuid
Authorization: Bearer {ADMIN_TOKEN}

{
  "reason": "User requested deletion"
}
```

## Error Handling

Common error responses:

```typescript
// Unauthorized
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

// Forbidden
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}

// Account Locked
{
  "statusCode": 401,
  "message": "Account is temporarily locked. Please try again in 25 minutes.",
  "error": "Unauthorized"
}

// 2FA Required
{
  "statusCode": 401,
  "message": "Two-factor authentication required. Please provide a valid TOTP token or backup code.",
  "error": "Unauthorized"
}
```

## Best Practices

1. **Always use HTTPS** in production
2. **Enable 2FA** for all admin accounts
3. **Store backup codes** securely offline
4. **Rotate passwords** regularly
5. **Review sessions** periodically
6. **Use strong passwords** (12+ characters)
7. **Limit Super Admin** accounts
8. **Monitor failed login attempts**
9. **Review audit logs** regularly
10. **Revoke sessions** when compromised

## Related Documentation

- [Auth Module](./auth.md) - User authentication
- [User Module](./user.md) - User management
- [Email Module](./email.md) - Email notifications
- [Database Schema](../database.md) - Database structure

---

[← Back to Main README](../../README.md)