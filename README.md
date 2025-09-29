# Avigate Backend API

Nigeria's Smart Local Transportation Navigation System - Backend API

## Overview

Avigate is a comprehensive transportation navigation system designed specifically for Nigerian cities. This backend API provides route planning, fare management, community features, and real-time transportation information.

## Features

### Core Features
- 🗺️ **Smart Route Planning** - Multi-modal transportation routing
- 💰 **Fare Management** - Crowdsourced fare data and estimates
- 👥 **Community Features** - User-generated content and safety reports
- 🔗 **Direction Sharing** - Share routes with custom instructions
- 📱 **Mobile-First API** - Optimized for mobile applications
- 🔐 **Secure Authentication** - JWT-based auth for users and admins
- 📊 **Analytics & Insights** - Comprehensive usage analytics

### Transportation Modes
- 🚌 Bus (including BRT)
- 🚕 Taxi (shared and private)
- 🛺 Keke NAPEP (tricycles)
- 🏍️ Okada (motorcycles)
- 🚶 Walking routes
- 🚗 Private car directions

## Quick Start

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- Redis (optional, for caching)
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/avigate/avigate-backend.git
   cd avigate-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Set up all database tables and seed data
   npm run setup:all
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication
The API uses JWT tokens for authentication:

```javascript
// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// Use token in headers
Authorization: Bearer YOUR_JWT_TOKEN
```

### Key Endpoints

#### Navigation
```bash
POST /api/navigation/plan-route    # Plan routes between locations
GET  /api/navigation/routes/:id    # Get route details
GET  /api/navigation/locations/search  # Search locations
```

#### Community
```bash
GET  /api/community/feed           # Get community posts
POST /api/community/posts          # Create community post
POST /api/community/safety-reports # Submit safety report
```

#### Fares
```bash
POST /api/fares/feedback           # Submit fare feedback
GET  /api/fares/routes/:id         # Get route fare info
POST /api/fares/compare            # Compare fares
```

#### Direction Sharing
```bash
POST /api/directions               # Create shareable directions
GET  /api/directions/:shareId      # Access shared directions
```

### Example Route Planning Request

```javascript
POST /api/navigation/plan-route
{
  "startLocation": {
    "latitude": 6.5244,
    "longitude": 3.3792,
    "name": "Victoria Island"
  },
  "endLocation": {
    "latitude": 6.4302,
    "longitude": 3.4313,
    "name": "Ikoyi"
  },
  "transportModes": ["bus", "taxi", "keke_napep"],
  "preferences": {
    "maxFare": 1000,
    "preferSafeRoutes": true
  }
}
```

## API Features

### Real-time Features
- Live vehicle availability tracking
- Real-time fare updates
- Community alerts and notifications

### Security Features
- JWT authentication with refresh tokens
- Rate limiting and DDoS protection
- Input validation and sanitization
- CORS configuration
- Helmet security headers

### Performance Features
- Redis caching for frequently accessed data
- Database query optimization
- Response compression
- Request/response logging


## Support

For support and questions:
- 📧 Email: support@avigate.co
- 📖 Documentation: https://docs.avigate.co
- 🐛 Issues: GitHub Issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Avigate** - Making Nigerian transportation accessible, affordable, and reliable for everyone.