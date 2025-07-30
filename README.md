# AI Chance Maker API

A Node.js TypeScript API with Prisma, JWT authentication, and modular architecture.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
```
Edit `.env` with your database and email credentials.

3. **Database setup:**
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Optional: Open Prisma Studio
npm run prisma:studio
```

4. **Start the server:**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout (requires auth)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email/:token` - Verify email address

### Health Check
- `GET /health` - Server health status

## Project Structure

```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── middleware/      # Express middleware
├── validators/      # Joi validation schemas
├── routes/          # API routes
├── utils/           # Utility functions
├── types/           # TypeScript interfaces
└── database/        # Database configuration
```

## Technologies Used

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with bcrypt
- **Validation:** Joi
- **Email:** Nodemailer
- **Security:** Helmet, CORS