# 🚂 Railway Database Migration Guide

This guide will help you migrate your local PostgreSQL database to Railway.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- Your local database running (for data export)

## Step 1: Create Railway Database

1. **Go to Railway**: Visit [railway.app](https://railway.app) and sign in
2. **Create New Project**: Click "New Project" → "Provision PostgreSQL"
3. **Get Connection URL**: 
   - Go to your PostgreSQL database
   - Click "Connect" 
   - Copy the "Postgres Connection URL"

## Step 2: Backup Local Data (Optional)

If you want to migrate existing data:

```bash
# Export your local database
pg_dump -h localhost -U karthiknaidudintakurthi vanitha-logistics > backup.sql
```

## Step 3: Update Environment Variables

1. **Edit `.env.local`**:
   ```bash
   # Replace the DATABASE_URL with your Railway URL
   DATABASE_URL="postgresql://[username]:[password]@[host]:[port]/[database]"
   ```

2. **Example Railway URL format**:
   ```
   DATABASE_URL="postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway"
   ```

## Step 4: Migrate Schema and Data

Run these commands in order:

```bash
# 1. Generate Prisma client for new database
npm run db:generate

# 2. Push schema to Railway database
npm run db:push

# 3. Seed initial data
npm run db:seed

# 4. (Optional) Import existing data
psql [YOUR_RAILWAY_DATABASE_URL] < backup.sql
```

## Step 5: Verify Migration

1. **Check database connection**:
   ```bash
   npm run db:studio
   ```

2. **Test the application**:
   ```bash
   npm run dev
   ```

## Step 6: Deploy to Production

### Option A: Deploy to Railway
1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Option B: Deploy to Vercel
1. Push your code to GitHub
2. Connect to Vercel
3. Add `DATABASE_URL` environment variable in Vercel dashboard
4. Deploy

## Environment Variables for Production

Make sure to set these in your deployment platform:

```env
DATABASE_URL="your_railway_database_url"
JWT_SECRET="your_jwt_secret"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="your_production_url"
```

## Troubleshooting

### Common Issues:

1. **Connection refused**: Check if Railway database is active
2. **Authentication failed**: Verify username/password in DATABASE_URL
3. **Schema mismatch**: Run `npm run db:push` to sync schema
4. **Data not migrated**: Check backup file and import process

### Useful Commands:

```bash
# Check database connection
npm run setup-railway

# Reset database (WARNING: deletes all data)
npm run db:reset

# View database in browser
npm run db:studio
```

## Cost Considerations

- Railway offers a free tier with limited usage
- Monitor your usage in Railway dashboard
- Consider upgrading if you exceed free tier limits

## Security Notes

- Never commit `.env.local` to version control
- Use strong JWT secrets in production
- Enable SSL connections for production databases
- Regularly backup your Railway database

## Next Steps

After successful migration:

1. ✅ Test all application features
2. ✅ Verify data integrity
3. ✅ Set up monitoring and alerts
4. ✅ Configure automated backups
5. ✅ Update deployment scripts

---

**Need help?** Check Railway documentation or create an issue in your repository.
