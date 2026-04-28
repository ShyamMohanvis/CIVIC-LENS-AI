# 🏛️ CIVIC LENS AI

> One-click AI-powered civic issue reporting with automatic department routing, duplicate detection, live tracking, and emergency escalation.

## 🎯 Features

- **📸 Register Complaint**: Capture photos, auto-detect location, AI classification
- **📍 Track Complaint**: Real-time status updates with visual timeline
- **🚨 SOS Emergency**: Quick access to emergency services with geolocation
- **👮 Admin Portal**: Dashboard for government officials to manage complaints

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)

### Installation

1. **Clone and Install**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Configure Environment**
```bash
# In server directory, create .env file
cp .env.example .env
# Edit .env with your MongoDB URI if needed
```

3. **Run the Application**
```bash
# Terminal 1: Start Backend
cd server
node index.js

# Terminal 2: Start Frontend
cd client
npm run dev
```

4. **Access the App**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📁 Project Structure

```
CIVI Lens/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── pages/         # Home, Register, Track, SOS, Admin
│   │   ├── components/    # ShadCN UI components
│   │   └── lib/           # Utilities
│   └── package.json
│
└── server/                # Node.js Backend
    ├── controllers/       # Business logic
    ├── models/            # MongoDB schemas
    ├── routes/            # API endpoints
    ├── utils/             # AI service (mock)
    └── package.json
```

## 🛠️ Tech Stack

**Frontend**
- React + Vite
- Tailwind CSS v4
- ShadCN UI
- Axios
- React Router
- Leaflet.js (maps)

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (real-time)
- Cloudinary (image storage)
- Multer (file upload)

## 🎨 Key Flows

### Flow 1: Register Complaint
1. User opens camera/uploads image
2. Geolocation auto-detected
3. AI classifies issue type
4. System checks for duplicates (within 100m)
5. Routes to appropriate department
6. Saves to database

### Flow 2: Track Complaint
1. Displays all complaints
2. Color-coded status badges
3. Shows location, date, department
4. Real-time updates via Socket.IO

### Flow 3: SOS Emergency
1. Auto-detects user location
2. Shows nearby emergency services
3. One-tap calling for Police/Ambulance
4. Can register emergency complaint

### Flow 4: Admin Portal
1. View all complaints in table
2. Update status (Pending → In Progress → Resolved)
3. Dashboard with statistics

## 🔧 Configuration

### MongoDB
Default: `mongodb://localhost:27017/civic-lens`

For MongoDB Atlas, update `server/.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/civic-lens
```

### Cloudinary (Optional)
For real image uploads, add to `server/.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### AI Classification (Optional)
Currently uses mock AI. To integrate real AI (OpenAI Vision):
1. Add API key to `server/.env`
2. Update `server/utils/aiService.js`

## 📝 API Endpoints

```
GET  /api/complaints       - Fetch all complaints
POST /api/complaints       - Create new complaint (multipart/form-data)
```

## 🎯 Hackathon Ready

This project is optimized for hackathons:
- ✅ Clear impact (civic engagement)
- ✅ AI integration (classification + duplicate detection)
- ✅ Real-world value (government use case)
- ✅ Clean demo story (4 distinct flows)
- ✅ Mobile-first design
- ✅ Zero-friction UX (no login required)

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! This is a hackathon project designed for rapid iteration.

---

Built with ❤️ for better civic engagement
