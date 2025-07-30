# Database Seeding

This project includes a seed script to populate the database with initial data, including an admin user and sample testimonials.

## What Gets Seeded

### Admin User

- **Email**: `admin@destinn.com`
- **Password**: `Admin123!`
- **Role**: `admin`
- **Name**: System Administrator
- **Status**: Email verified and active

### Sample Testimonials

- 3 realistic testimonials with user profiles
- Includes names, ages, locations, opportunities, and testimonials
- Profile images from Unsplash

## How to Run the Seed Script

### Method 1: Using npm script (Recommended)

```bash
npm run seed
```

### Method 2: Direct execution

```bash
npx ts-node prisma/seed.ts
```

### Method 3: With Prisma migrate

```bash
npx prisma migrate reset --seed
```

## Prerequisites

1. **Database Setup**: Ensure your PostgreSQL database is running and accessible
2. **Environment Variables**: Make sure your `.env` file has the correct `DATABASE_URL`
3. **Dependencies**: Install all dependencies with `npm install`
4. **Prisma Client**: Generate the Prisma client with `npm run prisma:generate`

## Environment Variables Required

```env
DATABASE_URL="postgresql://username:password@localhost:5432/destinn_db"
```

## Safety Features

- **Duplicate Prevention**: The script checks if the admin user already exists before creating
- **Error Handling**: Proper error handling with descriptive messages
- **Transaction Safety**: Uses Prisma's built-in transaction handling

## Admin Login Credentials

After running the seed script, you can login to the admin panel with:

```
Email: admin@destinn.com
Password: Admin123!
```

⚠️ **Security Note**: Change the admin password after your first login in production environments.

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Check your `DATABASE_URL` in `.env`
   - Ensure PostgreSQL is running
   - Verify database exists

2. **Permission Errors**

   - Ensure the database user has CREATE permissions
   - Check table permissions

3. **TypeScript Errors**
   - Run `npm run prisma:generate` to update the Prisma client
   - Ensure all dependencies are installed

### Reset and Re-seed

To completely reset the database and re-seed:

```bash
npx prisma migrate reset --seed
```

This will:

1. Drop all tables
2. Run all migrations
3. Execute the seed script automatically
