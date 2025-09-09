# Avigate API

> **Backend API for Nigeria's local transportation navigation system**

Navigate Nigerian cities using buses, taxis, keke napep, okada, and trains with real-time route information and crowdsourced updates.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/AvigateGroup/avigate-api.git
cd avigate-api
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Setup database
createdb avigate_dev
npm run migrate

# Start development server
npm run dev
```

**API runs on:** `http://localhost:3000`  
**Documentation:** `http://localhost:3000/api-docs`

## 📡 Core Endpoints

### Authentication
```http
POST /api/v1/auth/register     # Register new user
POST /api/v1/auth/login        # User login
POST /api/v1/auth/google       # Google OAuth
PUT  /api/v1/auth/profile      # Update profile
```

### Locations
```http
GET  /api/v1/locations/search?q=ikeja&city=lagos
GET  /api/v1/locations/nearby?lat=6.5244&lng=3.3792
POST /api/v1/locations/create
```

### Routes & Navigation
```http
GET  /api/v1/routes/search?from={id}&to={id}
POST /api/v1/routes/create
POST /api/v1/routes/{id}/feedback
```

### Crowdsourcing
```http
POST /api/v1/crowdsource/fare-report
POST /api/v1/crowdsource/route-update
POST /api/v1/crowdsource/new-route
```

## 🛡️ Features

- **🔐 Security**: JWT auth, rate limiting, input validation
- **🌍 Nigerian Focus**: State/city validation, phone numbers, coordinates
- **⚡ Performance**: Redis caching, database indexing, connection pooling
- **📊 Smart Crowdsourcing**: Reputation-based contributions
- **🚌 Multi-Modal**: Support for all Nigerian transport types
- **📱 Mobile Ready**: RESTful API designed for mobile apps

## 🏗️ Tech Stack

- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL with PostGIS
- **Cache**: Redis
- **Validation**: Joi
- **Auth**: JWT + Google OAuth
- **Docs**: Swagger/OpenAPI

## 📋 Environment Variables

```bash
# Database
DB_HOST=localhost
DB_NAME=avigate_dev
DB_USER=postgres
DB_PASSWORD=yourpassword

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## 🧪 Development

```bash
npm run dev          # Start with hot reload
npm test             # Run tests
npm run lint         # Code linting
npm run migrate      # Database migrations
```

## 📊 Rate Limits

- **New users**: 10 requests/minute
- **Verified users**: 30 requests/minute  
- **High reputation**: 100 requests/minute
- **Content creation**: Based on reputation score

## 🌟 Key Models

### User
- Nigerian phone validation
- Reputation scoring system
- Multi-language support (EN, HA, IG, YO, Pidgin)

### Location
- Geospatial coordinates (Nigeria boundaries)
- Popular landmarks integration
- Search optimization

### Route
- Multi-step journey planning
- Vehicle type support (bus, taxi, keke, okada, train)
- Fare estimation with crowdsourced data

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature/name`
5. Submit Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---
