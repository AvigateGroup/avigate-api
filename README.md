# Avigate API - Nigeria's Smart Transportation Navigation System

## Overview
RESTful API built with NestJS + TypeScript for Avigate mobile application.

## Features
- User Authentication (Email/Password & Google OAuth)
- Admin Panel with Role-Based Access Control
- Location & Route Management
- Real-time Fare Management
- Community Features
- Analytics Dashboard
- Email Notifications (ZeptoMail)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Database Setup

```bash
# Run migrations
npm run migration:run
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Access Swagger docs at: `http://localhost:3000/api/docs`

## Project Structure

- `src/modules/` - Feature modules
- `src/common/` - Shared guards, decorators, filters
- `src/config/` - Configuration files
- `src/utils/` - Utility functions

## Testing

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## License
Proprietary - Avigate Team
*/