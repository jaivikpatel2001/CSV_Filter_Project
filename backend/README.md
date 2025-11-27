# CSV/Excel Transformation Backend

Backend API server for the CSV/Excel transformation webapp. Built with Express, MongoDB, and Node.js.

## Features

- 📤 File upload (CSV, XLS, XLSX) with streaming support for large files
- 👁️ Preview first 50 rows before transformation
- 🔄 Deterministic column transformations based on business rules
- 💾 Bottle deposit mapping support
- 📊 Transformation history and re-run capability
- ⚡ Async processing with progress tracking
- ✅ Comprehensive unit tests (>90% coverage)

## Prerequisites

- Node.js >= 18
- MongoDB (optional, for history features)
- npm or yarn

## Installation

```bash
cd backend
npm install
```

## Configuration

Create a `.env` file (or copy from `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csv-filter
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
CORS_ORIGIN=http://localhost:5173
```

### Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string (optional)
- `NODE_ENV` - Environment (development/production)
- `UPLOAD_DIR` - Directory for uploaded files (default: ./uploads)
- `MAX_FILE_SIZE` - Max file size in bytes (default: 100MB)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)

## Running the Server

### Development mode (with auto-reload)

```bash
npm run dev
```

### Production mode

```bash
npm start
```

### Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Documentation

### Base URL

`http://localhost:5000/api`

### Endpoints

#### 1. Upload File

**POST** `/api/upload-file`

Upload a CSV or Excel file for transformation.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (file upload)

**Response:**
```json
{
  "uploadId": "uuid",
  "filename": "sample.csv",
  "fileType": "csv",
  "fileSize": 12345,
  "preview": [...],
  "columns": ["Item", "UPC", ...],
  "message": "File uploaded successfully"
}
```

#### 2. Get Preview

**GET** `/api/preview/:uploadId`

Get preview of uploaded file with transformation details.

**Response:**
```json
{
  "uploadId": "uuid",
  "filename": "sample.csv",
  "fileType": "csv",
  "fileSize": 12345,
  "columns": ["Item", "UPC", ...],
  "preview": [...],
  "outputColumns": ["Item", "UPC", ...]
}
```

#### 3. Transform File

**POST** `/api/transform`

Start transformation of uploaded file.

**Request:**
```json
{
  "uploadId": "uuid",
  "depositMapId": "uuid (optional)",
  "outputFormat": "csv"
}
```

**Response:**
```json
{
  "transformId": "uuid",
  "message": "Transformation started",
  "status": "processing"
}
```

#### 4. Get Transform Status

**GET** `/api/transform-status/:transformId`

Check transformation progress and status.

**Response:**
```json
{
  "transformId": "uuid",
  "status": "completed",
  "rowsProcessed": 1000,
  "warnings": ["Row 5: No deposit mapping found..."],
  "createdAt": "2025-11-27T00:00:00.000Z",
  "completedAt": "2025-11-27T00:01:00.000Z"
}
```

#### 5. Download Transformed File

**GET** `/api/download/:transformId`

Download the transformed CSV file.

**Response:**
- File download (CSV format)

#### 6. Upload Deposit Mapping

**POST** `/api/upload-deposit-map`

Upload a deposit mapping file.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (CSV/Excel with columns: UPC, Item, DepositPrice, DepositID)

**Response:**
```json
{
  "depositMapId": "uuid",
  "filename": "deposit-mapping.csv",
  "totalMappings": 150,
  "message": "Deposit mapping uploaded successfully"
}
```

#### 7. List Deposit Maps

**GET** `/api/deposit-maps`

Get list of all deposit mappings.

**Response:**
```json
[
  {
    "depositMapId": "uuid",
    "filename": "deposit-mapping.csv",
    "totalMappings": 150,
    "createdAt": "2025-11-27T00:00:00.000Z"
  }
]
```

#### 8. Get History

**GET** `/api/history`

Get transformation history (last 50 transformations).

**Response:**
```json
[
  {
    "transformId": "uuid",
    "uploadId": "uuid",
    "filename": "sample.csv",
    "status": "completed",
    "rowsProcessed": 1000,
    "warningCount": 5,
    "createdAt": "2025-11-27T00:00:00.000Z",
    "completedAt": "2025-11-27T00:01:00.000Z"
  }
]
```

#### 9. Delete Transform

**DELETE** `/api/transform/:transformId`

Delete a transformation and its output file.

**Response:**
```json
{
  "message": "Transform deleted successfully"
}
```

#### 10. Health Check

**GET** `/health`

Check server health and MongoDB connection status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T00:00:00.000Z",
  "mongodb": "connected"
}
```

## Transformation Rules

The transformation engine applies the following rules:

### Columns Removed
- Status
- CaseUPC
- MANUFACTURER
- REG_MULTIPLE
- CASE_RETAIL
- TAX2, TAX3
- CASE_DEPOSIT
- PRC_GRP
- FUTURE_RETAIL, FUTURE_COST, FUTURE_ACTIVE_DATE, FUTURE_MULTIPLE
- BRAND
- PBHN
- CLASS

### Columns Kept (No Change)
- Item
- Description
- Department
- REG_RETAIL
- PACK
- REGULARCOST
- FOOD_STAMP
- WIC
- SALE_COST
- TPR_COST
- ITEM_SIZE
- ITEM_UOM

### Columns Transformed

#### UPC
- Remove exactly one leading zero if present
- Example: `012345` → `12345`

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

### Special Pricing Logic

#### SALE_MULTIPLE
- If `SALE_MULTIPLE <= 1`:
  - Keep `SALE_RETAIL` unchanged
  - Add `SPECIAL PRICING #1 = "0"`
- If `SALE_MULTIPLE > 1`:
  - Set `SALE_GROUP = original SALE_RETAIL`
  - Set `SALE_RETAIL = REG_RETAIL`
  - Add `SPECIAL PRICING #1 = "2"`

#### TPR_MULTIPLE
- If `TPR_MULTIPLE <= 1`:
  - Keep `TPR_RETAIL` unchanged
  - Add `SPECIAL PRICING #2 = "0"`
- If `TPR_MULTIPLE > 1`:
  - Set `TRP_GROUP = original TPR_RETAIL`
  - Set `TPR_RETAIL = REG_RETAIL`
  - Add `SPECIAL PRICING #2 = "2"`

## Testing

The backend includes comprehensive unit tests covering:

- UPC transformation
- TAX1 mapping
- Date normalization
- Special pricing logic (SALE/TPR)
- Deposit mapping
- Edge cases and error handling

Run tests with:

```bash
npm test
```

View coverage report:

```bash
npm run test:coverage
```

## Sample Data

Sample files are provided in `sample-data/`:

- `sample-input.csv` - Example input file with various test cases
- `deposit-mapping.csv` - Example deposit mapping file

## Project Structure

```
backend/
├── src/
│   ├── models/
│   │   └── models.js          # MongoDB schemas
│   ├── routes/
│   │   └── api.js             # API routes
│   ├── utils/
│   │   ├── transformer.js     # Core transformation logic
│   │   └── fileProcessor.js   # File parsing and streaming
│   └── server.js              # Express server
├── tests/
│   └── transformer.test.js    # Unit tests
├── sample-data/
│   ├── sample-input.csv
│   └── deposit-mapping.csv
├── uploads/                   # Upload directory (created automatically)
├── .env                       # Environment variables
├── .env.example              # Environment template
├── package.json
└── jest.config.json
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid input)
- `404` - Resource not found
- `500` - Server error

Error responses include a descriptive message:

```json
{
  "error": "Error description"
}
```

## Performance

- **Streaming**: Large files are processed using Node.js streams to minimize memory usage
- **Async Processing**: Transformations run asynchronously to avoid blocking
- **Progress Tracking**: Real-time progress updates during transformation
- **File Size Limit**: Configurable max file size (default 100MB)

## License

ISC
