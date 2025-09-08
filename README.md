# 💧 Hydration Reminder - Complete Web App

A comprehensive **full-stack web application** that helps you stay hydrated throughout the day with smart reminders and detailed analytics. Built with modern web technologies and featuring push notifications, offline support, and beautiful visualizations.

## ✨ Features

### 🔐 User Authentication
- **JWT-based authentication** with email and password
- Secure password hashing using bcrypt
- User profile management and settings

### 📱 Push Notifications
- **Web Push Notifications** that work even when the website is closed
- **Hourly reminders** from 1 AM to 12 PM
- VAPID keys for secure notification delivery
- Custom notification actions (Log Water, Snooze)
- **10-second audio alert** when notification is clicked

### 💧 Water Intake Tracking
- Quick logging with preset amounts (Half Glass, Full Glass, Bottle, Large Bottle)
- Custom amount input (1-2000ml)
- Real-time progress tracking toward daily goals
- Recent intake history with timestamps

### 📊 Advanced Analytics
- **Interactive charts** using Chart.js
- Multiple view options: Daily, Weekly, Monthly, Hourly
- Time-range filtering and customizable periods
- Peak consumption hour analysis
- Progress summaries and statistics

### 🎨 Modern UI/UX
- **Responsive design** built with React and Tailwind CSS
- Beautiful gradient backgrounds and smooth animations
- Mobile-first approach with excellent desktop experience
- Dark mode support and accessibility features

### ⚡ Technical Features
- **Progressive Web App (PWA)** with offline support
- Service Worker for background notifications
- MongoDB database with efficient indexing
- RESTful API with comprehensive error handling
- Real-time data synchronization

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **web-push** for notifications
- **node-cron** for scheduled tasks

### Frontend
- **React 18** with modern hooks
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Chart.js** with React integration
- **Axios** for API calls
- **React Router** for navigation

### DevOps & Tools
- **Service Worker** for PWA functionality
- **VAPID** keys for secure push notifications
- **Environment variables** for configuration
- **ESLint** and **Prettier** for code quality

## 📁 Project Structure

```
hydration-app/
├── backend/
│   ├── server.js              # Express server setup
│   ├── models/                # MongoDB schemas
│   │   ├── User.js
│   │   ├── WaterLog.js
│   │   └── Subscription.js
│   ├── routes/                # API endpoints
│   │   ├── auth.js
│   │   ├── water.js
│   │   └── notifications.js
│   ├── utils/                 # Utility functions
│   │   ├── jwt.js
│   │   ├── webPush.js
│   │   └── generateVapidKeys.js
│   ├── cron/                  # Scheduled tasks
│   │   └── notifications.js
│   ├── .env.example           # Environment template
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── sw.js              # Service Worker
│   │   ├── manifest.json      # PWA manifest
│   │   └── sounds/
│   │       └── alert.mp3      # Notification sound
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── WaterLogger.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── NotificationToggle.jsx
│   │   │   └── AudioAlert.jsx
│   │   ├── pages/             # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── api/               # API integration
│   │   │   └── api.js
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── .env.example           # Environment template
│   └── package.json
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **MongoDB** (local installation or Atlas cloud)
- Modern web browser with push notification support

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd hydration-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/hydration-app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
VAPID_EMAIL=mailto:your-email@example.com
```

**Frontend (.env):**
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Generate VAPID Keys

VAPID keys are required for push notifications:

```bash
cd backend
npm run generate-vapid
```

Copy the generated keys to your `backend/.env` file:
```env
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🎯 Usage Guide

### Getting Started
1. **Sign up** for a new account or **login** with existing credentials
2. **Enable push notifications** in the Settings tab for hourly reminders
3. **Set your daily water goal** (default: 2000ml)
4. Start **logging your water intake** using the quick buttons or custom amounts

### Logging Water
- Use preset buttons: Half Glass (100ml), Full Glass (200ml), Bottle (500ml), Large Bottle (1000ml)
- Enter custom amounts up to 2000ml per entry
- View real-time progress toward your daily goal
- See recent entries with timestamps

### Analytics Dashboard
- **Daily View**: Track intake over days/weeks/months
- **Weekly View**: See weekly patterns and trends
- **Monthly View**: Long-term hydration habits
- **Hourly View**: Discover your peak drinking times

### Push Notifications
- Receive hourly reminders from 1 AM to 12 PM
- Click notifications to open the app with sound alert
- Use notification actions for quick logging
- Disable/enable anytime in Settings

## 🔧 Development

### Available Scripts

**Backend:**
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run generate-vapid  # Generate VAPID keys for push notifications
```

**Frontend:**
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### API Endpoints

**Authentication:**
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

**Water Logging:**
- `POST /api/water/log` - Log water intake
- `GET /api/water/logs` - Get water logs with pagination
- `DELETE /api/water/logs/:id` - Delete water log entry

**Analytics:**
- `GET /api/water/analytics/today` - Today's summary
- `GET /api/water/analytics/daily` - Daily analytics
- `GET /api/water/analytics/weekly` - Weekly analytics
- `GET /api/water/analytics/monthly` - Monthly analytics
- `GET /api/water/analytics/hourly` - Hourly breakdown

**Notifications:**
- `GET /api/notifications/vapid-public-key` - Get VAPID public key
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `POST /api/notifications/unsubscribe` - Unsubscribe from notifications
- `POST /api/notifications/test` - Send test notification

### Database Schema

**Users Collection:**
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  name: String,
  dailyGoal: Number (default: 2000),
  notificationsEnabled: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**WaterLogs Collection:**
```javascript
{
  userId: ObjectId (required),
  amountMl: Number (required, 1-2000),
  type: String (half-glass, full-glass, half-liter, liter, custom),
  notes: String,
  timestamp: Date (default: now),
  createdAt: Date,
  updatedAt: Date
}
```

**Subscriptions Collection:**
```javascript
{
  userId: ObjectId (required),
  endpoint: String (unique, required),
  keys: {
    p256dh: String (required),
    auth: String (required)
  },
  userAgent: String,
  isActive: Boolean (default: true),
  lastNotificationSent: Date,
  failedAttempts: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Environment Setup

**Production Environment Variables:**

Backend:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hydration-app
JWT_SECRET=your-very-secure-jwt-secret-for-production
VAPID_PUBLIC_KEY=your-production-vapid-public-key
VAPID_PRIVATE_KEY=your-production-vapid-private-key
VAPID_EMAIL=mailto:your-production-email@domain.com
FRONTEND_URL=https://your-domain.com
```

Frontend:
```env
VITE_API_URL=https://your-api-domain.com/api
```

### Deployment Options

1. **Heroku** (Backend) + **Netlify/Vercel** (Frontend)
2. **DigitalOcean App Platform** (Full-stack)
3. **AWS EC2** with **MongoDB Atlas**
4. **Docker** containers with **Docker Compose**

### Build Commands

**Backend:**
```bash
npm install --production
npm start
```

**Frontend:**
```bash
npm run build
# Serve the dist/ folder with a static server
```

## 🔧 Troubleshooting

### Common Issues

**1. Push Notifications Not Working:**
- Check if VAPID keys are properly configured
- Verify HTTPS is enabled in production
- Ensure browser supports push notifications
- Check service worker registration

**2. Database Connection Issues:**
- Verify MongoDB is running (local) or connection string is correct (Atlas)
- Check firewall settings and network connectivity
- Ensure database user has proper permissions

**3. CORS Errors:**
- Verify `FRONTEND_URL` in backend environment variables
- Check if both frontend and backend are running on correct ports
- Ensure credentials are properly configured

**4. Authentication Issues:**
- Verify JWT secret is consistent
- Check token expiration settings
- Ensure cookies/localStorage is not being cleared

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=hydration-app:* npm run dev

# Frontend
VITE_DEBUG=true npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or need help:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed description
3. Include logs and environment details
4. Follow the issue template

## 🎉 Acknowledgments

- **Chart.js** for beautiful data visualizations
- **Tailwind CSS** for rapid UI development
- **MongoDB** for flexible data storage
- **Express.js** for robust API development
- **React** ecosystem for modern frontend development

---

**Built with ❤️ for better hydration habits**

Stay hydrated and healthy! 💧
