# 🏛️ Municipal Complaint Management System

A comprehensive web application for citizens to submit municipal complaints with location tracking, file uploads, and admin management capabilities. Features Google OAuth authentication, real-time location services, and a robust admin dashboard for complaint management.

![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Google Maps](https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [File Structure Explained](#-file-structure-explained)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔐 User Authentication

- **Google OAuth 2.0 Integration** - Secure login with Google accounts
- **Manual Registration/Login** - Traditional email/password authentication
- **Profile Management** - Complete user profiles with personal information
- **JWT Token Authentication** - Secure API access with JSON Web Tokens

### 📝 Complaint Management

- **Location-Based Complaints** - GPS coordinates with Google Maps integration
- **File Upload System** - Support for images and audio recordings
- **Priority Levels** - High/Medium/Low priority classification
- **Real-time Status Updates** - Track complaint progress (Pending → In Progress → Resolved)
- **Interactive Maps** - Drag-and-drop location selection

### 👨‍💼 Admin Dashboard

- **City-Based Assignment** - Admins manage complaints in their assigned cities
- **Status Management** - Update complaint status and add responses
- **Analytics Dashboard** - Visual charts and statistics
- **Filter & Search** - Filter by date, priority, status, and location
- **Bulk Operations** - Manage multiple complaints efficiently

### 🗺️ Location Services

- **Reverse Geocoding** - Convert coordinates to detailed addresses
- **Interactive Maps** - Google Maps integration with draggable markers
- **Address Enhancement** - Detailed location information including street, city, state
- **Location Validation** - Automatic city/state assignment for admin routing

## 🛠️ Tech Stack

### Backend

- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt.js** - Password hashing and encryption
- **Multer** - File upload middleware
- **Google Auth Library** - OAuth 2.0 implementation
- **Google Maps API** - Geocoding and reverse geocoding services

### Frontend

- **React 19** - Modern JavaScript library for building user interfaces
- **React Router DOM** - Client-side routing
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **FontAwesome** - Icon library
- **Chart.js** - Interactive charts and graphs
- **Axios** - HTTP client for API requests
- **Google OAuth React** - Google authentication component

## 🏗️ Project Structure

```
GoogleAuth+Mongo/
├── 📁 backend/                     # Node.js/Express server
│   ├── 📁 middleware/
│   │   └── auth.js                 # JWT authentication middleware
│   ├── 📁 models/                  # MongoDB schemas
│   │   ├── Admin.js                # Admin user model
│   │   ├── Complaint.js            # Complaint data model
│   │   └── User.js                 # User account model
│   ├── 📁 routes/                  # API route handlers
│   │   ├── admin.js                # Admin management endpoints
│   │   ├── auth.js                 # Authentication endpoints
│   │   ├── complaints.js           # Complaint CRUD operations
│   │   └── user.js                 # User profile endpoints
│   ├── 📁 services/
│   │   └── geocodingService.js     # Google Maps geocoding service
│   ├── 📁 uploads/                 # File storage directory
│   ├── .env                        # Environment variables
│   ├── package.json                # Node.js dependencies
│   └── server.js                   # Express server entry point
│
├── 📁 frontend/                    # React application
│   ├── 📁 public/                  # Static assets
│   ├── 📁 src/
│   │   ├── 📁 assets/              # Images and static files
│   │   ├── 📁 components/          # Reusable React components
│   │   │   ├── AdminMapView.jsx    # Admin map interface
│   │   │   ├── ComplaintForm.jsx   # Complaint submission form
│   │   │   ├── ExploreComplaints.jsx # Public complaint viewer
│   │   │   ├── FilterControls.jsx  # Filter and search controls
│   │   │   ├── GoogleMap.jsx       # Google Maps component
│   │   │   ├── Graph.jsx           # Chart visualizations
│   │   │   └── useComplaintFilters.js # Custom filtering hook
│   │   ├── 📁 pages/               # Application pages
│   │   │   ├── AdminDashboard.jsx  # Admin control panel
│   │   │   ├── AdminLogin.jsx      # Admin authentication
│   │   │   ├── CompleteProfile.jsx # User profile completion
│   │   │   ├── Dashboard.jsx       # User dashboard
│   │   │   └── Login.jsx           # User authentication
│   │   ├── App.jsx                 # Main application component
│   │   ├── index.css               # Global styles
│   │   └── main.jsx                # React app entry point
│   ├── eslint.config.js            # ESLint configuration
│   ├── package.json                # React dependencies
│   ├── postcss.config.js           # PostCSS configuration
│   ├── tailwind.config.js          # TailwindCSS configuration
│   └── vite.config.js              # Vite build configuration
│
└── README.md                       # Project documentation
```

## 🚀 Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **Google Cloud Console** account for Maps API and OAuth
- **Git** for version control

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/municipal-complaint-system.git
cd municipal-complaint-system
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Install additional development dependencies
npm install --save-dev nodemon
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

## ⚙️ Configuration

### 1. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/complaint-system
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/complaint-system

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 2. Google Cloud Console Setup

#### Google OAuth 2.0:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **Google OAuth2 API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set **Application Type** to "Web application"
6. Add **Authorized Origins**: `http://localhost:5173`, `http://localhost:5174`
7. Add **Authorized Redirect URIs**: `http://localhost:5173`, `http://localhost:5174`
8. Copy the **Client ID** to your `.env` file

#### Google Maps API:

1. In the same Google Cloud Console project
2. Enable **Maps JavaScript API**, **Geocoding API**, and **Places API**
3. Go to **Credentials** → **Create Credentials** → **API Key**
4. Restrict the API key to your specific APIs for security
5. Copy the **API Key** to your `.env` file

### 3. Frontend Environment Setup

Create a `.env` file in the `frontend` directory:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Database Setup

#### Option A: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service:

   ```bash
   # Windows
   net start MongoDB

   # macOS/Linux
   sudo systemctl start mongod
   ```

3. Use connection string: `mongodb://localhost:27017/complaint-system`

#### Option B: MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get connection string and update `.env` file

### 5. Create Admin Users

Run this script in MongoDB Compass or MongoDB shell to create admin users:

```javascript
// Create admin users for different cities
db.admins.insertMany([
  {
    adminId: "ADMIN001",
    name: "Delhi Admin",
    password: "$2a$10$8xQxK5ZxZnA3zQzL7Nz8UeVc3nG5QjJ4X7yD6WqS8FvPzB9tR5mNy", // hashed "admin123"
    assignedCity: "Delhi",
    assignedState: "Delhi",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
  },
  {
    adminId: "ADMIN002",
    name: "Mumbai Admin",
    password: "$2a$10$8xQxK5ZxZnA3zQzL7Nz8UeVc3nG5QjJ4X7yD6WqS8FvPzB9tR5mNy", // hashed "admin123"
    assignedCity: "Mumbai",
    assignedState: "Maharashtra",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
  },
]);
```

**Default Admin Credentials:**

- **Admin ID**: ADMIN001, ADMIN002, etc.
- **Password**: admin123

## 🎯 Usage

### 1. Start the Application

#### Terminal 1 - Backend Server:

```bash
cd backend
npm run dev
# OR
node server.js
```

Server will run on: `http://localhost:5000`

#### Terminal 2 - Frontend Development:

```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:5173`

### 2. Application Access

#### For Citizens:

1. Open `http://localhost:5173`
2. Click "Login with Google" or create manual account
3. Complete your profile (name, phone, address)
4. Submit complaints with location, photos, and details

#### For Administrators:

1. Go to `http://localhost:5173/admin`
2. Login with Admin ID and password
3. View and manage complaints assigned to your city
4. Update complaint status and add responses

### 3. Key Features Usage

#### Submitting a Complaint:

1. **Location**: Allow browser location access or drag map to select location
2. **Description**: Provide detailed complaint description
3. **Photo**: Upload image or take photo with camera
4. **Audio**: Record voice message or upload audio file (optional)
5. **Priority**: Select High/Medium/Low priority level
6. **Contact**: Phone number (auto-filled from profile)

#### Admin Management:

1. **Dashboard**: View statistics and complaint overview
2. **Filter**: Filter by status, date range, priority, location
3. **Update Status**: Change from Pending → In Progress → Resolved
4. **Communication**: Add messages and responses to complaints
5. **Map View**: Visualize complaints on interactive map

## 📡 API Endpoints

### Authentication Routes (`/auth`)

```
POST /auth/google          # Google OAuth login
POST /auth/register        # Manual user registration
POST /auth/login          # Manual user login
```

### User Routes (`/user`)

```
GET  /user/me             # Get current user profile
PUT  /user/me             # Update user profile
POST /user/complete       # Complete user profile
```

### Complaint Routes (`/complaints`)

```
GET  /complaints          # Get user's complaints
POST /complaints          # Submit new complaint
GET  /complaints/:id      # Get specific complaint
PUT  /complaints/:id      # Update complaint
POST /complaints/:id/messages  # Add message to complaint
```

### Admin Routes (`/admin`)

```
POST /admin/login         # Admin authentication
GET  /admin/complaints    # Get assigned complaints
PUT  /admin/complaints/:id/status  # Update complaint status
POST /admin/complaints/:id/respond # Add admin response
GET  /admin/stats         # Get dashboard statistics
```

## 📂 File Structure Explained

### Backend Components

#### **Models** (`/models/`)

- **`User.js`** - User account schema with Google OAuth integration
- **`Admin.js`** - Admin user schema with city assignments
- **`Complaint.js`** - Complaint schema with location, attachments, and messaging

#### **Routes** (`/routes/`)

- **`auth.js`** - Handles user authentication (Google OAuth + manual)
- **`user.js`** - User profile management and updates
- **`complaints.js`** - Complaint CRUD operations with file uploads
- **`admin.js`** - Admin dashboard functionality and complaint management

#### **Services** (`/services/`)

- **`geocodingService.js`** - Google Maps geocoding integration for address resolution

#### **Middleware** (`/middleware/`)

- **`auth.js`** - JWT token validation and user authentication

### Frontend Components

#### **Pages** (`/src/pages/`)

- **`Login.jsx`** - User authentication with Google OAuth and manual login
- **`Dashboard.jsx`** - User dashboard for viewing and managing complaints
- **`CompleteProfile.jsx`** - Profile completion form for new users
- **`AdminLogin.jsx`** - Admin authentication interface
- **`AdminDashboard.jsx`** - Admin control panel with complaint management

#### **Components** (`/src/components/`)

- **`ComplaintForm.jsx`** - Interactive form for submitting complaints
- **`GoogleMap.jsx`** - Google Maps integration with location selection
- **`ExploreComplaints.jsx`** - Public complaint viewing interface
- **`AdminMapView.jsx`** - Admin map visualization of complaints
- **`FilterControls.jsx`** - Search and filter functionality
- **`Graph.jsx`** - Chart visualizations using Chart.js
- **`useComplaintFilters.js`** - Custom React hook for filtering logic

## 🔧 Configuration Files

### Backend Configuration

- **`server.js`** - Express server setup with middleware and routes
- **`package.json`** - Node.js dependencies and scripts

### Frontend Configuration

- **`vite.config.js`** - Vite build tool configuration
- **`tailwind.config.js`** - TailwindCSS styling configuration
- **`eslint.config.js`** - Code linting rules and standards

## 🚀 Deployment

### Frontend Deployment (Netlify/Vercel)

```bash
cd frontend
npm run build
# Deploy the 'dist' folder to your hosting service
```

### Backend Deployment (Heroku/Railway/DigitalOcean)

```bash
# Add production environment variables
# Deploy backend with your preferred service
```

### Environment Variables for Production

Update your production environment with:

- Production MongoDB URI
- Production Google OAuth credentials
- Production domain in OAuth settings
- Secure JWT secret
- CORS origins updated for production domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/municipal-complaint-system/issues) page
2. Create a new issue with detailed description
3. Include error messages, screenshots, and system information

## 🙏 Acknowledgments

- **Google Maps API** for location services
- **MongoDB Atlas** for cloud database hosting
- **React Community** for excellent documentation
- **Express.js** for robust backend framework
- **TailwindCSS** for modern styling utilities

---

**Built with ❤️ for better municipal governance and citizen engagement**
