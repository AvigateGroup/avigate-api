# Auth Module

The Auth Module handles user authentication, registration, and account security for the Avigate platform. It provides multiple authentication methods including email/password and Google OAuth.

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Authentication Flow](#authentication-flow)
- [Services](#services)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [Usage Examples](#usage-examples)

## Overview

The Auth Module implements a secure, user-friendly authentication system with:
- Email/password registration and login
- Google OAuth 2.0 integration
- OTP-based email verification
- Two-step login process for enhanced security
- Device tracking and management
- Password reset functionality
- Refresh token rotation

### Key Responsibilities

- User registration with email verification
- Multi-step login with OTP verification
- Google OAuth authentication
- Token management (access & refresh tokens)
- Device registration and tracking
- Password reset via email
- Session management

## Features

### 🔐 Multi-Factor Authentication

**Two-Step Login Process:**
1. **Step 1**: Validate credentials (email + password)
2. **Step 2**: Verify OTP sent to email
3. Issue access and refresh tokens

This prevents unauthorized access even if passwords are compromised.

### 📧 Email Verification

- OTP codes sent via ZeptoMail
- 10-minute expiration
- Resend functionality with rate limiting
- Auto-verification for Google OAuth users

### 📱 Device Management

- FCM token registration
- Device fingerprinting
- Device activation tracking
- New device login notifications
- Multi-device support

### 🔄 Token Management

- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Automatic token rotation
- Secure logout with token invalidation

### 🌐 Google OAuth Integration

- Google Sign-In support
- Account linking for existing users
- Phone number capture for OAuth users
- Profile picture import

## Authentication Flow

### Registration Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /auth/register
       │    {email, password, firstName, ...}
       ▼
┌─────────────────┐
│ Registration    │
│   Service       │
└──────┬──────────┘
       │
       │ 2. Create user account
       │ 3. Generate 6-digit OTP
       │ 4. Send welcome email with OTP
       ▼
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 5. POST /auth/verify-email
       │    {email, otpCode}
       ▼
┌─────────────────┐
│ Verification    │
│   Service       │
└──────┬──────────┘
       │
       │ 6. Validate OTP
       │ 7. Mark user as verified
       │ 8. Generate JWT tokens
       │ 9. Activate devices
       ▼
┌─────────────┐
│   Client    │
│  (Logged In)│
└─────────────┘
```

### Login Flow (2-Step)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /auth/login
       │    {email, password}
       ▼
┌─────────────────┐
│  Login Service  │
└──────┬──────────┘
       │
       │ 2. Validate credentials
       │ 3. Check if user verified
       │ 4. Generate login OTP
       │ 5. Send OTP email
       ▼
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 6. POST /auth/login/verify-otp
       │    {email, otpCode, fcmToken}
       ▼
┌─────────────────┐
│  Login Service  │
└──────┬──────────┘
       │
       │ 7. Validate OTP
       │ 8. Generate JWT tokens
       │ 9. Register device
       │ 10. Return tokens & user data
       ▼
┌─────────────┐
│   Client    │
│  (Logged In)│
└─────────────┘
```

### Google OAuth Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. User clicks "Sign in with Google"
       │ 2. Google OAuth consent screen
       │ 3. Receive Google ID token
       │
       │ 4. POST /auth/google
       │    {email, googleId, idToken, ...}
       ▼
┌─────────────────┐
│ Google Auth     │
│   Service       │
└──────┬──────────┘
       │
       │ 5. Verify Google token (optional)
       │ 6. Check if user exists
       │    
       │    If NEW user:
       │    - Create account
       │    - Auto-verify email
       │    
       │    If EXISTING user (local):
       │    - Link Google account
       │    
       │ 7. Generate JWT tokens
       │ 8. Register device (if FCM token)
       ▼
┌─────────────┐
│   Client    │
│  (Logged In)│
└──────┬──────┘
       │
       │ If phone missing:
       │ 9. PUT /auth/capture-phone
       │    {phoneNumber}
       ▼
┌─────────────┐
│   Complete  │
└─────────────┘
```

## Services

### RegistrationService

Handles new user registration.

**Key Methods:**

```typescript
register(registerDto: RegisterDto, req: Request)
```

**Process:**
1. Validate email uniqueness
2. Validate phone uniqueness (if provided)
3. Hash password with bcrypt (10 rounds)
4. Create user account
5. Register device (if FCM token provided)
6. Generate OTP for email verification
7. Send welcome email with OTP

### LoginService

Manages the two-step login process.

**Key Methods:**

```typescript
// Step 1: Validate credentials and send OTP
login(loginDto: LoginDto, req: Request)

// Step 2: Verify OTP and complete login
verifyLoginOtp(verifyDto: VerifyLoginOtpDto, req: Request)

// Resend login OTP
resendLoginOtp(email: string, req: Request)
```

**Login Step 1 Process:**
1. Find and validate user credentials
2. Check account status (active, not locked)
3. Handle unverified users
4. Check OTP rate limit
5. Generate 6-digit OTP
6. Send OTP email
7. Return success with email

**Login Step 2 Process:**
1. Find user by email
2. Validate OTP code
3. Mark OTP as used
4. Generate JWT tokens
5. Update user login info
6. Register device (if FCM token)
7. Return tokens and user data

### VerificationService

Email verification management.

**Key Methods:**

```typescript
verifyEmail(verifyDto: VerifyEmailDto, req: Request)
resendVerification(email: string, req: Request)
generateAndSendVerificationOtp(user: User, isEmailChange: boolean)
```

**Verification Process:**
1. Find user by email
2. Validate OTP code and expiration
3. Mark OTP as used
4. Set user as verified
5. Generate JWT tokens
6. Activate all user devices
7. Return tokens

### GoogleAuthService

Google OAuth integration.

**Key Methods:**

```typescript
googleAuth(googleAuthDto: GoogleAuthDto, req: Request)
capturePhoneNumber(user: User, captureDto: CapturePhoneDto)
verifyGoogleToken(idToken: string)  // Optional security
```

**OAuth Process:**
1. Optional: Verify Google ID token
2. Check if user exists with email
3. **New User**: Create account, auto-verify
4. **Existing User (Local)**: Link Google account
5. **Existing User (Google)**: Normal login
6. Update profile picture if missing
7. Capture phone number if missing
8. Generate JWT tokens
9. Register device
10. Return user data and tokens

### PasswordResetService

Password reset functionality.

**Key Methods:**

```typescript
forgotPassword(forgotDto: ForgotPasswordDto, req: Request)
resetPassword(resetDto: ResetPasswordDto)
```

**Reset Process:**
1. Find user by email
2. Check if using Google OAuth (reject if no password)
3. Check rate limit
4. Generate password reset OTP
5. Send reset email
6. User receives OTP
7. Validate OTP
8. Update password
9. Invalidate all sessions
10. Send confirmation email

### TokenService

JWT token lifecycle management.

**Key Methods:**

```typescript
generateTokens(user: User)
refreshToken(refreshToken: string)
logout(user: User, fcmToken?: string)
```

**Token Configuration:**
- **Access Token**: 15 minutes expiration
- **Refresh Token**: 7 days expiration
- Payload: `{userId, email}`

**Refresh Process:**
1. Verify refresh token signature
2. Find user by ID
3. Validate stored refresh token matches
4. Check token expiration
5. Generate new tokens
6. Update stored refresh token
7. Return new access token

### DeviceService

Device registration and tracking.

**Key Methods:**

```typescript
updateOrCreateDevice(
  userId: string,
  fcmToken: string,
  req: Request,
  deviceInfo?: string,
  skipNotification?: boolean
)
```

**Device Registration:**
1. Extract user agent and IP
2. Generate device fingerprint (SHA256 hash)
3. Check if device exists (by FCM token)
4. Update existing or create new device
5. Send new device notification email
6. Mark device as active

**Device Fingerprint:**
```typescript
SHA256(fcmToken + userAgent + deviceInfo + ipAddress)
```

### OtpService

OTP generation and storage.

**Key Methods:**

```typescript
generateAndSaveOTP(
  userId: string,
  otpType: OTPType,
  ipAddress?: string
): Promise<string>
```

**OTP Types:**
- `EMAIL_VERIFICATION`: For email verification
- `LOGIN_VERIFICATION`: For two-step login
- `PASSWORD_RESET`: For password resets

**Configuration:**
- Length: 6 digits
- Expiration: 10 minutes
- Rate limit: 1 minute between requests

## API Endpoints

### Registration & Verification

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/verify-email` | Public | Verify email with OTP |
| POST | `/auth/resend-verification` | Public | Resend verification OTP |

### Login (Two-Step)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Step 1: Validate credentials |
| POST | `/auth/login/verify-otp` | Public | Step 2: Verify OTP |
| POST | `/auth/login/resend-otp` | Public | Resend login OTP |

### Google OAuth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/google` | Public | Google OAuth login |
| PUT | `/auth/capture-phone` | Required | Capture phone number |

### Password Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Reset password with OTP |

### Token Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/refresh-token` | Public | Refresh access token |
| POST | `/auth/logout` | Required | Logout user |
| GET | `/auth/me` | Required | Get current user |

## Security

### Password Security

**Hashing:**
```typescript
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
```

**Requirements:**
- Minimum 8 characters recommended
- Stored as bcrypt hash
- Never returned in API responses

### OTP Security

**Configuration:**
```typescript
const OTP_LENGTH = 6;
const OTP_EXPIRATION_MINUTES = 10;
const RATE_LIMIT_SECONDS = 60;
```

**Rate Limiting:**
- Maximum 1 OTP request per minute
- Prevents OTP flooding attacks
- Applies to all OTP types

### Token Security

**Access Token:**
```typescript
{
  secret: process.env.JWT_SECRET,
  expiresIn: '15m'
}
```

**Refresh Token:**
```typescript
{
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: '7d',
  httpOnly: true  // Recommended for web apps
}
```

### Device Security

**Tracking:**
- Device fingerprint (SHA256)
- IP address logging
- User agent tracking
- Last active timestamp

**Notifications:**
- Email alert for new device logins
- Includes device info and IP
- Helps detect unauthorized access

### Test Accounts

For development and testing:

```typescript
// src/config/test-accounts.config.ts
export const TEST_ACCOUNTS = {
  'test@example.com': {
    password: 'TestPassword123!',
    googleId: 'google-test-id',
  },
};

export const TEST_SETTINGS = {
  bypassEmailVerification: true,
  bypassOTPVerification: true,
  bypassDeviceVerification: true,
  skipSecurityChecks: true,
};
```

## Usage Examples

### Complete Registration Flow

```typescript
// 1. Register new user
POST /api/v1/auth/register

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+2348012345678",
  "sex": "male",
  "country": "Nigeria",
  "language": "English",
  "fcmToken": "fcm-device-token-here"
}

// Response
{
  "success": true,
  "message": "Registration successful. Please check your email for verification code.",
  "data": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "requiresVerification": true
  }
}

// 2. Check email for OTP (e.g., 123456)

// 3. Verify email with OTP
POST /api/v1/auth/verify-email

{
  "email": "user@example.com",
  "otpCode": "123456"
}

// Response
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {...},
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}

// User is now logged in!
```

### Complete Login Flow (Two-Step)

```typescript
// 1. Login - Step 1: Validate credentials
POST /api/v1/auth/login

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

// Response
{
  "success": true,
  "message": "Credentials verified. A verification code has been sent to your email.",
  "data": {
    "email": "user@example.com",
    "requiresOtpVerification": true
  }
}

// 2. Check email for OTP (e.g., 654321)

// 3. Login - Step 2: Verify OTP
POST /api/v1/auth/login/verify-otp

{
  "email": "user@example.com",
  "otpCode": "654321",
  "fcmToken": "fcm-device-token-here",
  "deviceInfo": "iPhone 13 - iOS 16"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}

// User is now logged in!

// If OTP expired, resend it:
POST /api/v1/auth/login/resend-otp
{
  "email": "user@example.com"
}
```

### Google OAuth Flow

```typescript
// 1. Frontend: Get Google ID token from Google Sign-In

// 2. Send to backend
POST /api/v1/auth/google

{
  "email": "user@gmail.com",
  "googleId": "google-user-id",
  "firstName": "Jane",
  "lastName": "Smith",
  "profilePicture": "https://lh3.googleusercontent.com/...",
  "phoneNumber": "+2348012345678",  // Optional
  "sex": "female",                   // Optional
  "fcmToken": "fcm-token-here",
  "idToken": "google-id-token-here"  // Optional but recommended
}

// Response (New User)
{
  "success": true,
  "message": "Registration successful! Welcome to Avigate.",
  "data": {
    "user": {...},
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "requiresPhoneNumber": false,  // true if phone not provided
    "isNewUser": true
  }
}

// If phone number required:
PUT /api/v1/auth/capture-phone
Authorization: Bearer {ACCESS_TOKEN}

{
  "phoneNumber": "+2348012345678",
  "sex": "female"  // Optional
}
```

### Password Reset Flow

```typescript
// 1. Request password reset
POST /api/v1/auth/forgot-password

{
  "email": "user@example.com"
}

// Response (same response whether user exists or not)
{
  "success": true,
  "message": "If an account exists with this email, a password reset code will be sent",
  "data": {
    "email": "user@example.com"
  }
}

// 2. Check email for OTP

// 3. Reset password with OTP
POST /api/v1/auth/reset-password

{
  "email": "user@example.com",
  "otpCode": "789012",
  "newPassword": "NewSecurePassword123!"
}

// Response
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}

// 4. Login with new password (two-step login)
```

### Token Refresh

```typescript
POST /api/v1/auth/refresh-token

{
  "refreshToken": "eyJhbGci..."
}

// Response
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."  // New refresh token
  }
}

// Update tokens in client storage
```

### Logout

```typescript
POST /api/v1/auth/logout
Authorization: Bearer {ACCESS_TOKEN}

{
  "fcmToken": "fcm-token-here"  // Optional
}

// Response
{
  "success": true,
  "message": "Logout successful"
}

// Clear tokens from client storage
```

## Error Handling

Common error scenarios:

```typescript
// Invalid credentials
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

// Email not verified
{
  "success": false,
  "message": "Email not verified. A new verification code has been sent to your email.",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "requiresVerification": true
  }
}

// Invalid OTP
{
  "statusCode": 401,
  "message": "Invalid or expired verification code",
  "error": "Unauthorized"
}

// Rate limit exceeded
{
  "statusCode": 400,
  "message": "Please wait before requesting a new verification code. Check your email for the previous code.",
  "error": "Bad Request"
}

// Account deactivated
{
  "statusCode": 401,
  "message": "Account is deactivated",
  "error": "Unauthorized"
}

// Google OAuth user without password
{
  "statusCode": 400,
  "message": "This account uses Google sign-in. Please log in with Google.",
  "error": "Bad Request"
}
```

## Best Practices

### For Frontend Developers

1. **Store Tokens Securely**
   - Use secure storage (Keychain on iOS, KeyStore on Android)
   - Never log tokens
   - Clear tokens on logout

2. **Handle Token Expiration**
   - Implement automatic token refresh
   - Retry failed requests with new token
   - Redirect to login if refresh fails

3. **OTP Flow**
   - Show clear instructions
   - Implement countdown timer (10 minutes)
   - Provide resend functionality
   - Validate OTP format before sending

4. **Device Management**
   - Request FCM token after login
   - Update FCM token on changes
   - Handle device tracking permissions

5. **Error Handling**
   - Show user-friendly error messages
   - Implement retry logic
   - Log errors for debugging

### For Backend Developers

1. **Security**
   - Never expose sensitive data in responses
   - Always hash passwords
   - Use parameterized queries
   - Implement rate limiting
   - Validate all inputs

2. **Email Sending**
   - Use background jobs for emails
   - Handle email failures gracefully
   - Log email sending status
   - Implement retry logic

3. **Token Management**
   - Rotate refresh tokens
   - Implement token blacklisting for logout
   - Use short expiration for access tokens
   - Validate tokens on every request

4. **Database**
   - Use indexes on frequently queried fields
   - Soft delete user accounts
   - Archive old OTP records
   - Clean up expired sessions

5. **Monitoring**
   - Track failed login attempts
   - Monitor OTP usage
   - Log unusual patterns
   - Set up alerts for security events

## Related Documentation

- [User Module](./user.md) - User profile management
- [Admin Module](./admin.md) - Admin authentication
- [Email Module](./email.md) - Email notifications
- [Database Schema](../database.md) - Database structure

---

[← Back to Main README](../../README.md)