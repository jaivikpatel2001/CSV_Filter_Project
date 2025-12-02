# CSV/Excel Transformation Frontend

React-based frontend for the CSV/Excel transformation webapp. Built with React, Vite, and modern CSS.

## Features

- 📤 **File Upload**: Drag & drop or click to upload CSV/Excel files
- 🏢 **Vendor Selection**: Choose from multiple vendor transformation formats
- 👁️ **Preview**: View first 50 rows and column transformations before processing
- 📊 **Progress Tracking**: Real-time transformation status with polling
- ⬇️ **Download**: Get transformed CSV files ready for import
- 📜 **History**: View, re-run, and manage previous transformations
- 💾 **Deposit Mapping**: Upload and manage deposit mapping files
- 🎨 **Premium UI**: Modern dark theme with vibrant gradients and animations
- 📱 **Responsive**: Works on desktop, tablet, and mobile

## Supported Vendors

The frontend supports multiple vendor formats:

### 1. AGNE (Default)
- Standard AGNE CSV transformation
- Special pricing logic for sale and TPR items
- UPC transformation and bottle deposit mapping

### 2. Pine State Spirits – Monthly Specials
- Monthly specials transformation
- UPC padding to 13 digits
- Date formatting to MM/DD/YYYY
- Price formatting to 2 decimal places

## Prerequisites

- Node.js >= 18
- npm or yarn
- Backend server running (see [backend/README.md](../backend/README.md))

## Installation

```bash
cd frontend
npm install
```

## Configuration

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:5000/api)

## Running the Frontend

### Development mode (with hot reload)

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Production build

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview production build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Navbar.jsx         # Navigation bar
│   ├── pages/
│   │   ├── UploadPage.jsx     # File upload & vendor selection
│   │   ├── PreviewPage.jsx    # Preview & settings
│   │   ├── TransformPage.jsx  # Status & download
│   │   ├── DepositMapPage.jsx # Deposit mapping
│   │   └── HistoryPage.jsx    # History
│   ├── services/
│   │   └── api.js             # API client
│   ├── App.jsx                # Main app & routing
│   ├── index.css              # Design system
│   └── main.jsx               # Entry point
├── .env                       # Environment variables
├── package.json
├── vite.config.js
└── README.md
```

## Pages

### 1. Upload Page (`/`)
- Drag & drop file upload
- Vendor selection dropdown
- File format validation
- Automatic preview after upload

### 2. Preview Page (`/preview/:uploadId`)
- View first 50 rows of uploaded file
- See input and output column mappings
- Vendor-specific transformation preview
- Start transformation button

### 3. Transform Page (`/transform/:transformId`)
- Real-time progress tracking
- Row count and status updates
- Warning messages display
- Download button when complete

### 4. Deposit Map Page (`/deposit-map`)
- Upload deposit mapping files
- View existing mappings
- Manage deposit configurations

### 5. History Page (`/history`)
- View past transformations
- Re-run previous transformations
- Delete old transformations
- Filter and search history

## Design System

The app uses a custom CSS design system with:

- **Dark Theme**: Modern dark mode with vibrant accents
- **Color Palette**: 
  - Primary: `#6366f1` (Indigo)
  - Success: `#10b981` (Green)
  - Warning: `#f59e0b` (Amber)
  - Error: `#ef4444` (Red)
- **Typography**: Inter font family
- **Animations**: Smooth transitions and micro-interactions
- **Glassmorphism**: Frosted glass effects on cards
- **Gradients**: Vibrant color gradients

## API Integration

The frontend communicates with the backend API using the `api.js` service:

- `uploadFile(file, vendorId)` - Upload file with vendor selection
- `getPreview(uploadId)` - Get file preview
- `transformFile(uploadId, vendorId)` - Start transformation
- `getTransformStatus(transformId)` - Check transformation status
- `downloadTransformedFile(transformId)` - Download result
- `uploadDepositMap(file)` - Upload deposit mapping
- `getHistory()` - Get transformation history
- `deleteTransform(transformId)` - Delete transformation

## Vendor Selection

Users can select the vendor format from a dropdown on the upload page. The system will:

1. Fetch available vendors from the backend
2. Display vendor name and description
3. Apply vendor-specific transformation rules
4. Show vendor-specific column mappings in preview

## Responsive Design

The app is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Development

### Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Vanilla CSS** - Styling (no framework)

### Code Style

- Use functional components with hooks
- Follow React best practices
- Use semantic HTML
- Keep components focused and reusable

## Deployment

### Build for production

```bash
npm run build
```

### Deploy to static hosting

The `dist` folder can be deployed to:

- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

### Environment Variables for Production

Set `VITE_API_URL` to your production backend URL.

## Troubleshooting

### CORS Issues
- Ensure backend `CORS_ORIGIN` matches frontend URL
- Check that backend is running

### File Upload Issues
- Check file size limit (100MB default)
- Verify file format (CSV, XLS, XLSX)
- Ensure backend `UPLOAD_DIR` has write permissions

### API Connection Issues
- Verify `VITE_API_URL` in `.env`
- Check backend is running on correct port
- Check network/firewall settings

## License

ISC

## Related Documentation

- [Backend README](../backend/README.md) - Backend API documentation
- [Main README](../README.md) - Project overview
- [AGNE Vendor](../backend/src/utils/transformers/AGNE_README.md) - AGNE transformation rules
- [Pine State Spirits](../backend/src/utils/transformers/PINE_STATE_SPIRITS_README.md) - Pine State Spirits transformation rules
