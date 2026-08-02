# Backend Setup Guide

## Readme

To preview markdown file press "ctrl + shft + v" on the keyboard

## Prerequisites

- Node.js (v18+)
- Docker Desktop (for local PostgreSQL)
- pnpm

## Getting Started

### 1. Start the PostgreSQL Database

Start the Docker container with PostgreSQL:

```bash
pnpm docker:up
```

To view database logs:

```bash
pnpm docker:logs
```

To stop the database:

```bash
pnpm docker:down
```

### 2. Generate Prisma Client

Generate the Prisma client based on your schema:

```bash
pnpm db:generate
```

### 3. Run Database Migrations

Create and apply your first migration:

```bash
pnpm db:migrate
```

This will:

- Create a migration file in `prisma/migrations/`
- Apply the migration to your database
- Generate the Prisma Client

### 4. Seed the Database (Optional)

Populate the database with demo auth users (admin, HR, employee, and one pending approval):

```bash
pnpm db:seed          # Re-seed demo users
pnpm db:studio        # Browse data visually
pnpm prisma db seed   # Same as db:seed (Prisma CLI)
```

Demo credentials match the frontend seed data. Passwords are stored hashed in the database.

### 5. Start the Development Server

```bash
pnpm dev
```

## Available Scripts

### Database Management

- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:migrate` - Create and apply migrations
- `pnpm db:push` - Push schema changes without creating migrations (for prototyping)
- `pnpm db:studio` - Browse data visually (Prisma Studio)
- `pnpm db:seed` - Re-seed demo users
- `pnpm prisma db seed` - Same as `db:seed` (Prisma CLI)

### Docker Commands

- `pnpm docker:up` - Start PostgreSQL container
- `pnpm docker:down` - Stop PostgreSQL container
- `pnpm docker:logs` - View PostgreSQL logs

### Development

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## Database Connection

The database connection is configured in `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/capstone_dev?schema=public"
```

## Project Structure

This project follows a layered architecture pattern to maintain separation of concerns and improve code maintainability.

```
src/
├── index.ts              # Application entry point
├── config/               # Configuration files
│   ├── env.ts           # Environment variables validation
│   └── constants.ts     # Application constants
├── routes/              # API route definitions
│   ├── index.ts         # Main router aggregator
│   ├── auth.routes.ts   # Authentication routes
│   ├── user.routes.ts   # User routes
│   └── ...              # Other route files
├── controllers/         # Request handlers
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   └── ...
├── services/            # Business logic layer
│   ├── auth.service.ts
│   ├── user.service.ts
│   └── ...
├── repositories/        # Data access layer
│   ├── user.repository.ts
│   └── ...
├── middleware/          # Express middleware
│   ├── auth.middleware.ts
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   └── validator.ts
├── utils/               # Utility functions
│   ├── logger.ts
│   ├── crypto.ts
│   └── ...
├── types/               # TypeScript type definitions
│   ├── express.d.ts
│   └── models.ts
├── validators/          # Input validation schemas
│   ├── auth.validator.ts
│   └── user.validator.ts
├── lib/                 # External library configurations
│   └── prisma.ts        # Prisma client instance
└── generated/           # Auto-generated files
    └── prisma/          # Generated Prisma Client
```

### Layer Responsibilities

#### 1. Routes (`src/routes/`)

- Define API endpoints
- Map HTTP methods to controller functions
- Apply route-specific middleware
- Group related endpoints

**Example:**

```typescript
// src/routes/user.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);

export default router;
```

#### 2. Controllers (`src/controllers/`)

- Handle HTTP requests and responses
- Extract data from req (body, params, query)
- Call service layer functions
- Format and send responses
- Handle HTTP-specific logic (status codes, headers)

**Example:**

```typescript
// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const profile = await userService.getUserProfile(userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
```

#### 3. Services (`src/services/`)

- Implement business logic
- Coordinate between multiple repositories
- Handle complex operations and transformations
- Enforce business rules
- Independent of HTTP layer

**Example:**

```typescript
// src/services/user.service.ts
import * as userRepository from '../repositories/user.repository';
import { hashPassword } from '../utils/crypto';

export const getUserProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');

  // Remove sensitive data
  const { password, ...profile } = user;
  return profile;
};
```

#### 4. Repositories (`src/repositories/`)

- Direct database access using Prisma
- CRUD operations
- Database queries and transactions
- No business logic

**Example:**

```typescript
// src/repositories/user.repository.ts
import { prisma } from '../lib/prisma';

export const findById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

export const update = async (id: string, data: any) => {
  return prisma.user.update({ where: { id }, data });
};
```

#### 5. Middleware (`src/middleware/`)

- Authentication and authorization
- Request validation
- Error handling
- Rate limiting
- Logging

**Example:**

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### 6. Utils (`src/utils/`)

- Pure helper functions
- No side effects
- Reusable across the application
- Examples: date formatting, encryption, parsing

**Example:**

```typescript
// src/utils/logger.ts
export const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};
```

#### 7. Validators (`src/validators/`)

- Input validation schemas (using Zod, Joi, etc.)
- Type-safe validation rules
- Reusable validation logic

**Example:**

```typescript
// src/validators/user.validator.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
});
```

### Data Flow

```
Request → Routes → Middleware → Controllers → Services → Repositories → Database
                                                                              ↓
Response ← Routes ← Controllers ← Services ← Repositories ← Database
```

### Best Practices

1. **Single Responsibility**: Each layer should have one clear purpose
2. **Dependency Direction**: Always flow downward (controllers → services → repositories)
3. **No Skip Layers**: Controllers should not directly access repositories
4. **Error Handling**: Use try-catch in controllers and propagate errors properly
5. **Type Safety**: Use TypeScript interfaces and types throughout
6. **Testing**: Each layer should be testable independently

## Installed Packages

### Core Dependencies

- **Zod** (`zod`) - Schema validation
- **Prisma** (`prisma`, `@prisma/client`) - Database ORM
- **Express Rate Limit** (`express-rate-limit`) - Rate limiting middleware

### Usage Examples

#### Using Prisma Client

```typescript
import { prisma } from './lib/prisma.js';

// Find all users
const users = await prisma.user.findMany();

// Create a new user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
  },
});
```

#### Using Zod for Validation

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// Validate input
const result = userSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}
```

#### Using Rate Limiters

```typescript
import express from 'express';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

const app = express();

// Apply to all routes
app.use('/api/', apiLimiter);

// Apply to specific routes
app.post('/api/auth/login', authLimiter, loginHandler);
```

## Prisma Studio

To visually explore and edit your database:

```bash
pnpm db:studio
```

This will open Prisma Studio in your browser at `http://localhost:5555`.

## Troubleshooting

### Database Connection Issues

1. Make sure Docker is running
2. Verify the PostgreSQL container is up: `docker ps`
3. Check logs: `pnpm docker:logs`

### Prisma Client Not Found

Run `pnpm db:generate` to regenerate the Prisma Client.

### Migration Issues

If you need to reset the database (⚠️ destroys all data):

```bash
pnpm prisma migrate reset
```
