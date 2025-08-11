# MongoDB Setup Guide

## 🚀 Quick Start

### 1. Install MongoDB

#### Option A: Local MongoDB (Recommended for development)

```bash
# Windows (using Chocolatey)
choco install mongodb

# Or download from: https://www.mongodb.com/try/download/community
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string

### 2. Configure Environment Variables

Update your `.env.local` file with your MongoDB connection string:

```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/sentimentalsocial

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/sentimentalsocial?retryWrites=true&w=majority
```

### 3. Start MongoDB (if using local installation)

```bash
# Windows
mongod

# Or start as service
net start MongoDB
```

### 4. Test the Connection

```bash
# Start the development server
npm run dev
```

Then visit these endpoints:

- **Health Check**: http://localhost:3000/api/health
- **Test User Creation**: http://localhost:3000/api/test/user

## 🧪 Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": {
      "connected": true,
      "status": "healthy"
    }
  }
}
```

### 2. Create a Test User

```bash
curl -X POST http://localhost:3000/api/test/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "displayName": "Test User",
    "password": "Password123!"
  }'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser",
    "displayName": "Test User",
    "isVerified": false
  },
  "message": "User created successfully"
}
```

## 🔧 MongoDB Atlas Setup (Detailed)

1. **Create Account**: Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)

2. **Create Cluster**:
   - Choose "Build a Database"
   - Select "M0 Sandbox" (Free tier)
   - Choose your preferred cloud provider and region

3. **Configure Security**:
   - Create a database user with username/password
   - Add your IP address to the IP whitelist (or use 0.0.0.0/0 for development)

4. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

5. **Update Environment**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/sentimentalsocial?retryWrites=true&w=majority
   ```

## 🐛 Troubleshooting

### Common Issues:

1. **Connection Refused**
   - Make sure MongoDB is running (local)
   - Check if the port 27017 is available
   - Verify the connection string

2. **Authentication Failed**
   - Check username/password in connection string
   - Ensure database user exists in Atlas

3. **Network Timeout**
   - Add your IP to Atlas whitelist
   - Check firewall settings

4. **Database Not Found**
   - MongoDB will create the database automatically on first write
   - No action needed

### Logs Location:

- MongoDB logs: Check console output when running the app
- Application logs: Check the terminal where you run `npm run dev`

## 📊 Database Structure

The application will automatically create these collections:

- `users` - User accounts and profiles
- `posts` - Social media posts (when implemented)
- `follows` - User relationships (when implemented)

## 🔐 Security Notes

- **Never commit** your `.env.local` file
- Use strong passwords for database users
- In production, restrict IP access
- Enable authentication on local MongoDB instances

## 📈 Next Steps

After successful connection:

1. Implement additional API endpoints
2. Add authentication middleware
3. Create post and comment models
4. Implement social features (follow/unfollow)
5. Add real-time features with WebSockets
