# Quick Start Guide

Get the CSV/Excel Transformation Webapp running in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18 or higher (`node --version`)
- ✅ npm or yarn (`npm --version`)
- ⚠️ MongoDB (optional - app works without it, but history features will be disabled)

## Step-by-Step Setup

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Start the Application

**Option A: Without MongoDB (Quickest)**

Terminal 1 - Start Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Start Frontend:
```bash
cd frontend
npm run dev
```

**Option B: With MongoDB (Full Features)**

Terminal 1 - Start MongoDB:
```bash
mongod
```

Terminal 2 - Start Backend:
```bash
cd backend
npm run dev
```

Terminal 3 - Start Frontend:
```bash
cd frontend
npm run dev
```

### 3. Open the App

Navigate to: **http://localhost:5173**

You should see the upload page with a drag-and-drop area!

## First Transformation

1. **Upload a test file**
   - Use `backend/sample-data/sample-input.csv`
   - Or create your own CSV with the required columns

2. **Preview the data**
   - Review the first 50 rows
   - See which columns will be removed/transformed

3. **(Optional) Upload deposit mapping**
   - Click "Upload New Mapping"
   - Use `backend/sample-data/deposit-mapping.csv`

4. **Start transformation**
   - Click "Start Transformation"
   - Watch the progress

5. **Download the result**
   - Click "Download Transformed File"
   - Open in Excel or any CSV viewer

## Verify Installation

### Backend Health Check
Visit: http://localhost:5000/health

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "mongodb": "connected" // or "disconnected"
}
```

### Run Tests
```bash
cd backend
npm test
```

Should show: **30 tests passed**

## Common Issues

### Port Already in Use

**Backend (Port 5000):**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

**Frontend (Port 5173):**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9
```

### MongoDB Not Running

If you see "MongoDB connection error":
- **Option 1**: Start MongoDB (`mongod`)
- **Option 2**: Continue without MongoDB (history features disabled)

### CORS Errors

Ensure:
- Backend `.env` has: `CORS_ORIGIN=http://localhost:5173`
- Frontend `.env` has: `VITE_API_URL=http://localhost:5000/api`

## Next Steps

- 📖 Read the full [README.md](README.md)
- 🔧 Check [backend/README.md](backend/README.md) for API docs
- 🧪 Run tests: `npm test` in backend folder
- 🎨 Customize the UI in `frontend/src/index.css`
- 📊 Try different sample files

## Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csv-filter
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## Production Build

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the 'dist' folder
```

## Support

- 🐛 Found a bug? Check the troubleshooting section in README.md
- 💡 Have a question? Review the API documentation
- 🧪 Tests failing? Ensure all dependencies are installed

---

**You're all set! 🎉**

Start transforming your CSV/Excel files with confidence!
