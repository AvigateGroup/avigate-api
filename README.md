# Avigate API

**Nigeria's Smart Transportation Navigation System**

[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

## 📋 Overview

Avigate API is a comprehensive RESTful backend service powering Nigeria's intelligent transportation navigation mobile application. Built with NestJS and TypeScript, it provides robust authentication, real-time fare management, community features, and administrative controls.

## ✨ Key Features

- **Dual Authentication System**: Email/Password and Google OAuth 2.0
- **Role-Based Access Control (RBAC)**: Comprehensive admin panel with granular permissions
- **Two-Factor Authentication (2FA)**: TOTP-based security for admin accounts
- **OTP-Based Login**: Secure email verification for user authentication
- **Location & Route Management**: Real-time transportation data
- **Community Features**: User contributions and reputation system
- **Analytics Dashboard**: Comprehensive insights and metrics
- **Email Notifications**: Powered by ZeptoMail

## 🏗️ Architecture

### Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15.x with TypeORM
- **Authentication**: JWT + Passport
- **Email**: ZeptoMail
- **File Upload**: Cloudinary
- **API Documentation**: Swagger/OpenAPI

### Project Structure

```
avigate-api/
├── src/
│   ├── modules/
│   │   ├── admin/             # ✅ Admin management & authentication
│   │   ├── analytics/         # 🔄 Platform analytics (In Development)
│   │   ├── auth/              # ✅ User authentication & authorization
│   │   ├── cache/             # 🔄 Caching service (In Development)
│   │   ├── community/         # 🔄 Community features (In Development)
│   │   ├── email/             # 🔄 Email notifications (ZeptoMail)
│   │   ├── fare/              # 🔄 Fare management (In Development)
│   │   ├── health/            # 🔄 Health checks (In Development)
│   │   ├── location/          # 🔄 Location services (In Development)
│   │   ├── metrics/           # 🔄 Metrics tracking (In Development)
│   │   ├── notifications/     # 🔄 Push notifications (In Development)
│   │   ├── reputation/        # 🔄 User reputation system (In Development)
│   │   ├── route/             # 🔄 Route management (In Development)
│   │   ├── upload/            # 🔄 File upload services (AWS S3)
│   │   ├── user/              # ✅ User profile & management
│   │   └── websocket/         # 🔄 Real-time communication (In Development)
│   ├── common/
│   │   ├── guards/            # Authentication & authorization guards
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # Exception filters
│   │   └── interceptors/      # Response interceptors
│   ├── config/                # Configuration files
│   ├── migrations/            # Database migrations
│   ├── scripts/               # Utility scripts
│   ├── utils/                 # Utility functions
│   ├── app.module.ts          # Root application module
│   └── main.ts                # Application entry point
├── frontend/                  # Frontend assets (if any)
├── k8s/                       # Kubernetes configurations
├── logs/                      # Application logs
├── docs/                      # Documentation
├── dist/                      # Compiled output
├── .env                       # Environment variables
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── ormconfig.ts               # TypeORM config
└── README.md                  # This file

Legend:
✅ Tested & Production Ready
🔄 In Development / Testing
```

## 📚 Module Documentation

### ✅ Tested & Production Ready

- **[Admin Module](./docs/modules/admin.md)** - Admin authentication, management, and analytics
- **[Auth Module](./docs/modules/auth.md)** - User authentication and registration
- **[User Module](./docs/modules/user.md)** - User profile and account management


### 🔄 In Development

The following modules are currently under development and testing:

- **Analytics Module** - Platform analytics and metrics
- **Cache Module** - Redis-based caching service
- **Community Module** - User contributions and community features
- **Fare Module** - Transportation fare management
- **Health Module** - Application health checks and monitoring
- **Location Module** - Location services and geocoding
- **Metrics Module** - Performance metrics tracking
- **Notifications Module** - Push notifications (FCM)
- **Reputation Module** - User reputation and scoring system
- **Route Module** - Route planning and optimization
- **WebSocket Module** - Real-time bidirectional communication

Documentation for these modules will be added as they are tested and finalized.


## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15.x
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd avigate-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Environment Configuration

Configure your `.env` file with the following variables:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=avigate_db

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRATION=7d

# Admin JWT
ADMIN_JWT_SECRET=your_admin_jwt_secret
ADMIN_REFRESH_SECRET=your_admin_refresh_secret

# Email (ZeptoMail)
ZEPTOMAIL_API_KEY=your_zeptomail_api_key
ZEPTOMAIL_FROM_EMAIL=noreply@avigate.co
ZEPTOMAIL_FROM_NAME=Avigate

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1
FRONTEND_URL=http://localhost:3001
```

### Database Setup

```bash
# Run migrations
npm run migration:run

# Seed initial data (optional)
npm run seed
```

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3000/api/v1`

## 📖 API Documentation

### Swagger UI

Access the interactive API documentation at:

```
http://localhost:3000/api/docs
```

### Authentication

The API uses two separate authentication systems:

**User Authentication:**
- JWT Bearer tokens for regular users
- 2-step login with email OTP verification
- Google OAuth 2.0 support

**Admin Authentication:**
- Separate JWT tokens with longer expiration
- Session management with refresh tokens
- Optional TOTP 2FA
- HTTP-only cookies for refresh tokens

### Example Request

```bash
# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+2348012345678"
  }'

# Login (Step 1: Get OTP)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# Login (Step 2: Verify OTP)
curl -X POST http://localhost:3000/api/v1/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otpCode": "123456"
  }'

# Access protected endpoint
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🏃 Development

### Code Style

The project follows NestJS best practices and uses:
- ESLint for linting
- Prettier for code formatting
- TypeScript strict mode

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## 🔒 Security Features

### User Security
- Bcrypt password hashing (12 rounds)
- JWT with short-lived access tokens (15m)
- Refresh token rotation (7 days)
- Email OTP verification for login
- Device tracking and notification
- Account lockout after failed attempts

### Admin Security
- Enhanced password requirements (12+ characters)
- TOTP-based 2FA with backup codes
- Session management with IP tracking
- Domain-restricted access (@avigate.co)
- Account lockout (5 attempts, 30min)
- Password history tracking
- Invitation-based onboarding

## 📊 Database Schema

### Key Entities

- **User**: User accounts with profile data
- **UserDevice**: Registered devices with FCM tokens
- **UserOTP**: OTP codes for verification
- **Admin**: Admin accounts with enhanced security
- **AdminSession**: Admin login sessions

See [Database Documentation](./docs/database.md) for complete schema details.

## 🚢 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Environment Variables

Ensure all production environment variables are set:
- Set `NODE_ENV=production`
- Use strong random secrets for JWT
- Configure production database
- Set up email service credentials
- Configure CORS for your frontend domain

### Health Checks

```bash
# API health check
curl http://localhost:3000/api/v1/health

# Database health check
curl http://localhost:3000/api/v1/health/db
```

## 📝 API Versioning

The API uses URI versioning with the prefix `/api/v1/`. Future versions will be accessible at `/api/v2/`, etc.

## 🤝 Contributing

This is a private project. For internal contributors:

1. Create a feature branch from `develop`
2. Follow the code style guidelines
3. Write tests for new features
4. Submit a pull request with detailed description

## 📄 License

Proprietary - © 2024 Avigate Team. All rights reserved.

## 📞 Support

For issues or questions:
- **Email**: dev@avigate.co
- **Documentation**: [Internal Wiki](https://wiki.avigate.co)

## 🗺️ Roadmap

- [ ] Real-time route tracking
- [ ] Payment gateway integration
- [ ] Push notification service
- [ ] Advanced analytics dashboard
- [ ] Mobile app deep linking
- [ ] Multi-language support

---

**Built with ❤️ by the Avigate Team**