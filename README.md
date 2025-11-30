# CSV/Excel Transformation Webapp

A full-stack MERN (MongoDB, Express, React, Node.js) application for transforming CSV and Excel files according to specific business rules. Features a modern, premium UI with drag-and-drop upload, real-time progress tracking, and comprehensive data validation.

![Tech Stack](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

## 🌟 Features

### Core Functionality
- 📤 **File Upload**: Drag & drop or click to upload CSV/Excel files (up to 100MB)
- 👁️ **Preview**: View first 50 rows and column transformations before processing
- ⚙️ **Transformation**: Apply deterministic business rules to transform data
- 💾 **Bottle Deposit Mapping**: Upload and manage deposit mapping files
- 📊 **Progress Tracking**: Real-time transformation status with polling
- ⬇️ **Download**: Get transformed CSV files ready for import
- 📜 **History**: View, re-run, and manage previous transformations
- ⚠️ **Validation**: Row-level warnings for data quality issues

### Technical Features
- 🌊 **Streaming**: Handle large files (100k+ rows) without memory issues
- 🔄 **Async Processing**: Non-blocking transformations
- 🧪 **Tested**: >90% test coverage for core transformation logic
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🎨 **Premium UI**: Modern dark theme with vibrant gradients and animations
- 🔒 **Type Safety**: Comprehensive validation and error handling

## 📚 Documentation

- **[Quick Reference Guide](QUICK_REFERENCE.md)** - Fast lookup for transformation rules and examples
- **[Transformation Rules](TRANSFORMATION_RULES.md)** - Detailed explanation of all transformation logic
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical details and recent changes

## 📋 Transformation Rules

### Columns Removed
- Status, CaseUPC, MANUFACTURER
- REG_MULTIPLE, CASE_RETAIL
- TAX2, TAX3, CASE_DEPOSIT
- PRC_GRP, FUTURE_*, BRAND
- PBHN, CLASS

### Columns Kept (No Change)
- Item, Description, Department
- REG_RETAIL, PACK, REGULARCOST
- FOOD_STAMP, WIC
- SALE_COST, TPR_COST
- ITEM_SIZE, ITEM_UOM

### Transformations Applied

#### UPC
- Remove exactly one leading zero if present
- Example: `012345` → `12345`

#### Department (D)
- **NEW**: Preserve original Department ID if incoming value differs
- If original data available and values differ: use original with warning
- If no original data or values match: use incoming value

#### TAX1
- `Y` or `y` → `1`
- `N` or `n` → `` (empty)
- Other values: preserved with warning

#### BOTTLE_DEPOSIT
- Mapped from deposit mapping file (UPC/Item → DepositID)
- If no mapping found: empty with warning

#### Dates (SALE_START_DATE, SALE_END_DATE, TPR_START_DATE, TPR_END_DATE)
- Normalized to `YYYY-MM-DD` format
- Accepts: `YYYY-MM-DD`, `MM/DD/YYYY`, `DD-MM-YYYY`
- Invalid dates: empty with warning

#### Special Pricing Logic

**SALE_MULTIPLE:**
- **NEW**: If no Sale data (no SALE_RETAIL, SALE_COST, or dates):
  - `SPECIAL PRICING #1` = `` (null/empty)
- If Sale data exists and `SALE_MULTIPLE <= 1`:
  - Keep `SALE_RETAIL` unchanged
  - Add `SPECIAL PRICING #1 = "0"`
- If Sale data exists and `SALE_MULTIPLE > 1`:
  - Set `SALE_GROUP = original SALE_RETAIL`
  - Set `SALE_RETAIL = REG_RETAIL`
  - Add `SPECIAL PRICING #1 = "2"`

**TPR_MULTIPLE:**
- **NEW**: If no TRP data (no TPR_RETAIL, TPR_COST, or dates):
  - `SPECIAL PRICING #2` = `` (null/empty)
- If TRP data exists and `TPR_MULTIPLE <= 1`:
  - Keep `TPR_RETAIL` unchanged
  - Add `SPECIAL PRICING #2 = "0"`
- If TRP data exists and `TPR_MULTIPLE > 1`:
  - Set `TRP_GROUP = original TPR_RETAIL`
  - Set `TPR_RETAIL = REG_RETAIL`
  - Add `SPECIAL PRICING #2 = "2"`

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB (optional, for history features)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd CSV_Filter_Project
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Configure environment variables**

Backend (`.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csv-filter
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
CORS_ORIGIN=http://localhost:5173
```

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

5. **Start MongoDB** (optional)
```bash
mongod
```

6. **Start the backend server**
```bash
cd backend
npm run dev
```

7. **Start the frontend dev server**
```bash
cd frontend
npm run dev
```

8. **Open your browser**
```
http://localhost:5173
```

## 📁 Project Structure

```
CSV_Filter_Project/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── models.js          # MongoDB schemas
│   │   ├── routes/
│   │   │   └── api.js             # API endpoints
│   │   ├── utils/
│   │   │   ├── transformer.js     # Core transformation logic
│   │   │   └── fileProcessor.js   # File parsing & streaming
│   │   └── server.js              # Express server
│   ├── tests/
│   │   └── transformer.test.js    # Unit tests
│   ├── sample-data/
│   │   ├── sample-input.csv
│   │   └── deposit-mapping.csv
│   ├── .env
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx         # Navigation bar
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx     # File upload
│   │   │   ├── PreviewPage.jsx    # Preview & settings
│   │   │   ├── TransformPage.jsx  # Status & download
│   │   │   ├── DepositMapPage.jsx # Deposit mapping
│   │   │   └── HistoryPage.jsx    # History
│   │   ├── services/
│   │   │   └── api.js             # API client
│   │   ├── App.jsx                # Main app & routing
│   │   ├── index.css              # Design system
│   │   └── main.jsx               # Entry point
│   ├── .env
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

The test suite includes:
- UPC transformation tests
- TAX1 mapping tests
- Date normalization tests
- Special pricing logic tests
- Deposit mapping tests
- Edge case handling

**Coverage Target**: >90% for core transformation logic

## 📖 API Documentation

See [backend/README.md](backend/README.md) for complete API documentation.

### Key Endpoints

- `POST /api/upload-file` - Upload CSV/Excel file
- `GET /api/preview/:uploadId` - Get file preview
- `POST /api/transform` - Start transformation
- `GET /api/transform-status/:transformId` - Check status
- `GET /api/download/:transformId` - Download result
- `POST /api/upload-deposit-map` - Upload deposit mapping
- `GET /api/history` - Get transformation history

## 🎨 UI/UX Features

### Design System
- **Dark Theme**: Modern dark mode with vibrant accents
- **Gradients**: Smooth color transitions and glassmorphism
- **Typography**: Inter font family for premium look
- **Animations**: Smooth transitions and micro-interactions
- **Responsive**: Mobile-first design with breakpoints

### Components
- Drag & drop file upload
- Data preview tables
- Progress bars and spinners
- Status badges
- Alert messages
- Modal dialogs
- Responsive navigation

## 📊 Sample Data

Sample files are provided in `backend/sample-data/`:

### sample-input.csv
Contains test cases with:
- Different date formats
- Various TAX1 values (Y/N/y/n)
- SALE_MULTIPLE and TPR_MULTIPLE variations
- Items with and without deposits

### deposit-mapping.csv
Example deposit mapping file with:
- UPC codes
- Item names
- Deposit prices
- Deposit IDs

## 🔧 Configuration

### Backend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/csv-filter |
| `NODE_ENV` | Environment | development |
| `UPLOAD_DIR` | Upload directory | ./uploads |
| `MAX_FILE_SIZE` | Max file size (bytes) | 104857600 (100MB) |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |

### Frontend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:5000/api |

## 🚢 Deployment

### Backend Deployment

1. Set environment variables for production
2. Build and start:
```bash
npm start
```

### Frontend Deployment

1. Build for production:
```bash
npm run build
```

2. Serve the `dist` folder with a static server or deploy to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting service

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- App will run without MongoDB but history features will be disabled

### File Upload Issues
- Check `MAX_FILE_SIZE` in backend `.env`
- Ensure `UPLOAD_DIR` has write permissions
- Verify CORS settings match frontend URL

### Transformation Errors
- Check file format (CSV, XLS, XLSX)
- Verify column names match expected format
- Review warnings in transformation status

## 📝 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📧 Support

For issues or questions:
- Check the [API Documentation](backend/README.md)
- Review sample files in `backend/sample-data/`
- Check transformation rules above
- Open an issue on GitHub

## 🎯 Acceptance Criteria

✅ Upload sample file and receive correct preview of first 50 rows  
✅ Downloaded CSV matches transformation rules for varied test set  
✅ TAX1 mapping converts Y/y→1, N/n→empty; other values preserved with warning  
✅ UPC leading-zero removal removes exactly one leading zero if present  
✅ SALE/TPR special pricing columns added with correct logic for n<=1 and n>1  
✅ Deposit mapping import supported and used to populate BOTTLE_DEPOSIT  
✅ System handles CSVs with 100k+ rows without running out of memory (streaming)  
✅ Unit tests for transform function with ≥90% coverage for core logic  

## 🌟 Features Highlights

- **Premium UI**: Modern, responsive design with dark theme and vibrant gradients
- **Streaming Processing**: Handle large files efficiently
- **Real-time Updates**: Live progress tracking during transformation
- **Comprehensive Testing**: >90% test coverage
- **Error Handling**: Detailed warnings and validation
- **History Management**: Track and re-run previous transformations
- **Flexible Mapping**: Support for bottle deposit mapping files

---

**Built with ❤️ using the MERN stack**
