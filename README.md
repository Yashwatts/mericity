# 🏛️ MeriCity – Crowdsourced Civic Issue Reporting

[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)]
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)]
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)]
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)]
[![Google Maps](https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)]
[![Google Vision AI](https://img.shields.io/badge/Google_Vision_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)]

---

**Live Application:** [www.mericity.app](https://www.mericity.app)

---

## 📝 Overview

**MeriCity** is a modern, AI-powered municipal complaint management system. Citizens can report civic issues (like potholes, garbage, water leaks) with photos, GPS, and voice. Government departments get real-time, automated, and analytics-driven dashboards for efficient issue resolution.

---

## ✨ Features

### 🚀 Citizen Experience
- **One-click Login:** Google OAuth 2.0, OTP phone verification
- **Multi-modal Complaint Submission:** Text, voice, image
- **Auto-GPS Tagging:** Photos are geo-tagged for precise location
- **AI Description:** Google Vision AI suggests complaint text
- **Track Status:** Live updates from submission to resolution
- **Points & Rewards:** Earn points, badges, leaderboard

### 🗺️ Community & Mapping
- **Interactive Map:** See all public complaints, heatmaps, filters
- **National Coverage:** City/state agnostic, location-based filtering

### 🏢 Admin & Department Tools
- **Smart Routing:** AI auto-assigns complaints to the correct department
- **Performance Analytics:** Track resolution speed, volume, bottlenecks
- **Escalation & Warnings:** Auto-escalate overdue issues, send warnings
- **Bulk Actions:** Manage multiple complaints efficiently

### 💬 Communication
- **In-App Chat:** Real-time, multi-user chat on complaints
- **Notifications:** Web push updates for status and messages
- **File Sharing:** Upload additional evidence

### 🔒 Security
- JWT authentication, OTP phone verification, input validation, file restrictions, rate limiting, and CORS configuration

---

## 🛠️ Tech Stack

| Layer      | Technologies                                                                                                                                   |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Frontend**  | React 19, Vite, React Router DOM, TailwindCSS, Chart.js, Axios, Google OAuth React, Socket.io-client                                        |
| **Backend**   | Node.js, Express.js, MongoDB (Mongoose), JWT, Multer, Bcrypt.js, Socket.io, Google Auth Library                                            |
| **AI & Maps** | Google Vision API, Google Maps API, Google Geocoding API                                                                                   |
| **Comms**     | Twilio API (OTP/SMS)                                                                                                                       |

---

## 📡 Core API Endpoints

<details>
<summary>Authentication</summary>

```
POST /auth/google          # Google OAuth login
POST /auth/register        # Register new user
POST /auth/login           # Manual user login
POST /auth/verify-phone    # Send OTP
POST /auth/verify-otp      # Verify OTP
```
</details>
<details>
<summary>User</summary>

```
GET  /user/me              # Get profile
PUT  /user/me              # Update profile
POST /user/complete        # Complete profile setup
GET  /user/points          # Reward points
```
</details>
<details>
<summary>Complaints</summary>

```
GET  /complaints           # User's complaints
POST /complaints           # New complaint
GET  /complaints/:id       # Complaint detail
PUT  /complaints/:id       # Update complaint
POST /complaints/:id/messages # Add message
GET  /complaints/community # Public map
POST /complaints/vision-ocr # AI image analysis
```
</details>
<details>
<summary>Admin & Departments</summary>

```
POST /admin/login                # Admin login
GET  /admin/complaints           # Assigned complaints
PUT  /admin/complaints/:id/status # Update status
POST /admin/complaints/:id/respond # Add response
GET  /admin/analytics            # Statistics
POST /admin/warning              # Issue warning

POST /department/login           # Department login
GET  /department/complaints      # Department complaints
PUT  /department/accept          # Accept
PUT  /department/reject          # Reject
GET  /department/analytics       # Metrics
```
</details>
<details>
<summary>Rewards & Notifications</summary>

```
GET  /rewards                    # List rewards
POST /rewards/redeem             # Redeem points
GET  /notifications              # User notifications
PUT  /notifications/:id/read     # Mark as read
```
</details>

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- MongoDB (local or Atlas)
- Google Cloud Project (enable OAuth, Vision, Maps APIs)
- Twilio account for OTP

### 1. Clone Repository

```bash
git clone https://github.com/rohit-2059/Civic-Sense-Crowdsourced-Issue-Reporting.git
cd Civic-Sense-Crowdsourced-Issue-Reporting
```

### 2. Backend Setup

```bash
cd backend
npm install
# Create .env file (see sample below)
```

**Sample `.env`:**
```
MONGODB_URI=mongodb://localhost:27017/mericity
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
PORT=5000
NODE_ENV=development
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
# Create .env file (see sample below)
```

**Sample `.env`:**
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Seed Data (Optional)

```bash
cd ../backend
node seedDepartments.js
node seedRewards.js
```

### 5. Run the Application

```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd ../frontend
npm run dev
```

- **Citizens:** [http://localhost:5173](http://localhost:5173)
- **Admin Panel:** [http://localhost:5173/admin](http://localhost:5173/admin)
- **Department Dashboard:** [http://localhost:5173/department](http://localhost:5173/department)

---

## 💡 Usage Guide

### Citizens

- Login with Google or register manually
- Complete your profile (name, phone, address)
- Click "Report Issue", fill details, attach image/audio, submit
- Track your complaints and earn rewards

### Admin/Department

- Login via assigned credentials
- View and filter complaints
- Update status, respond, escalate, or close issues
- Monitor performance analytics

---

## 🤝 Contributing

1. Fork the repo
2. `git checkout -b feature/your-feature`
3. Commit and push
4. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 🙏 Acknowledgments

- Google Cloud Platform (Maps, Vision, OAuth)
- MongoDB Atlas
- React & Express.js communities
- TailwindCSS
- All open source contributors

---

**Developed by:** Yash Watts
**For:** Smart India Hackathon (SIH)  
**Contact:** yashwatts2005@gmail.com  
**Live:** [www.mericity.app](https://www.mericity.app)

---

_If you found this project helpful, please ⭐️ star the repository!_
