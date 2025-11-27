# API Documentation

Complete REST API documentation for the CSV/Excel Transformation Backend.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Currently, no authentication is required. All endpoints are publicly accessible.

## Response Format

All responses are in JSON format unless otherwise specified.

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error description"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Endpoints

### 1. Upload File

Upload a CSV or Excel file for transformation.

**Endpoint:** `POST /api/upload-file`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (File) - CSV, XLS, or XLSX file

**Response:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "sample.csv",
  "fileType": "csv",
  "fileSize": 12345,
  "preview": [
    {
      "Item": "Chips",
      "UPC": "012345",
      "Description": "Potato chips",
      ...
    }
  ],
  "columns": ["Item", "UPC", "Description", ...],
  "message": "File uploaded successfully"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/upload-file \
  -F "file=@sample.csv"
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/upload-file', {
  method: 'POST',
  body: formData
});

const data = await response.json();
```

---

### 2. Get Preview

Get preview of uploaded file with transformation details.

**Endpoint:** `GET /api/preview/:uploadId`

**URL Parameters:**
- `uploadId` (string) - Upload ID from upload response

**Response:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "sample.csv",
  "fileType": "csv",
  "fileSize": 12345,
  "columns": ["Item", "UPC", "Description", ...],
  "preview": [...],
  "outputColumns": ["Item", "UPC", "Description", "REG_RETAIL", ...]
}
```

**Example (cURL):**
```bash
curl http://localhost:5000/api/preview/550e8400-e29b-41d4-a716-446655440000
```

---

### 3. Start Transformation

Start transformation of uploaded file.

**Endpoint:** `POST /api/transform`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "depositMapId": "660e8400-e29b-41d4-a716-446655440000",
  "outputFormat": "csv"
}
```

**Parameters:**
- `uploadId` (string, required) - Upload ID
- `depositMapId` (string, optional) - Deposit mapping ID
- `outputFormat` (string, optional) - Output format: "csv" or "xlsx" (default: "csv")

**Response:**
```json
{
  "transformId": "770e8400-e29b-41d4-a716-446655440000",
  "message": "Transformation started",
  "status": "processing"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "depositMapId": "660e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 4. Get Transform Status

Check transformation progress and status.

**Endpoint:** `GET /api/transform-status/:transformId`

**URL Parameters:**
- `transformId` (string) - Transform ID from transform response

**Response:**
```json
{
  "transformId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "rowsProcessed": 1000,
  "warnings": [
    "Row 5: No deposit mapping found for UPC/Item: 12345",
    "Row 10: TAX1 has unexpected value: \"X\" (expected Y or N)"
  ],
  "error": null,
  "createdAt": "2025-11-27T00:00:00.000Z",
  "completedAt": "2025-11-27T00:01:00.000Z"
}
```

**Status Values:**
- `processing` - Transformation in progress
- `completed` - Transformation completed successfully
- `failed` - Transformation failed

**Example (cURL):**
```bash
curl http://localhost:5000/api/transform-status/770e8400-e29b-41d4-a716-446655440000
```

**Polling Example (JavaScript):**
```javascript
async function pollStatus(transformId) {
  const interval = setInterval(async () => {
    const response = await fetch(`http://localhost:5000/api/transform-status/${transformId}`);
    const data = await response.json();
    
    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(interval);
      console.log('Transformation finished:', data);
    }
  }, 2000); // Poll every 2 seconds
}
```

---

### 5. Download Transformed File

Download the transformed CSV file.

**Endpoint:** `GET /api/download/:transformId`

**URL Parameters:**
- `transformId` (string) - Transform ID

**Response:**
- File download (CSV format)
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="transformed-{original-filename}"`

**Example (cURL):**
```bash
curl http://localhost:5000/api/download/770e8400-e29b-41d4-a716-446655440000 \
  -o transformed-output.csv
```

**Example (JavaScript):**
```javascript
// Direct download
window.location.href = `http://localhost:5000/api/download/${transformId}`;

// Or with fetch
const response = await fetch(`http://localhost:5000/api/download/${transformId}`);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'transformed-output.csv';
a.click();
```

---

### 6. Upload Deposit Mapping

Upload a deposit mapping file.

**Endpoint:** `POST /api/upload-deposit-map`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (File) - CSV or Excel file with columns: UPC, Item, DepositPrice, DepositID

**Response:**
```json
{
  "depositMapId": "660e8400-e29b-41d4-a716-446655440000",
  "filename": "deposit-mapping.csv",
  "totalMappings": 150,
  "message": "Deposit mapping uploaded successfully"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/upload-deposit-map \
  -F "file=@deposit-mapping.csv"
```

---

### 7. List Deposit Mappings

Get list of all deposit mappings.

**Endpoint:** `GET /api/deposit-maps`

**Response:**
```json
[
  {
    "depositMapId": "660e8400-e29b-41d4-a716-446655440000",
    "filename": "deposit-mapping.csv",
    "totalMappings": 150,
    "createdAt": "2025-11-27T00:00:00.000Z"
  },
  {
    "depositMapId": "660e8400-e29b-41d4-a716-446655440001",
    "filename": "deposit-mapping-v2.csv",
    "totalMappings": 200,
    "createdAt": "2025-11-28T00:00:00.000Z"
  }
]
```

**Example (cURL):**
```bash
curl http://localhost:5000/api/deposit-maps
```

---

### 8. Get Transformation History

Get transformation history (last 50 transformations).

**Endpoint:** `GET /api/history`

**Response:**
```json
[
  {
    "transformId": "770e8400-e29b-41d4-a716-446655440000",
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "sample.csv",
    "status": "completed",
    "rowsProcessed": 1000,
    "warningCount": 5,
    "createdAt": "2025-11-27T00:00:00.000Z",
    "completedAt": "2025-11-27T00:01:00.000Z"
  }
]
```

**Example (cURL):**
```bash
curl http://localhost:5000/api/history
```

---

### 9. Delete Transformation

Delete a transformation and its output file.

**Endpoint:** `DELETE /api/transform/:transformId`

**URL Parameters:**
- `transformId` (string) - Transform ID to delete

**Response:**
```json
{
  "message": "Transform deleted successfully"
}
```

**Example (cURL):**
```bash
curl -X DELETE http://localhost:5000/api/transform/770e8400-e29b-41d4-a716-446655440000
```

---

### 10. Health Check

Check server health and MongoDB connection status.

**Endpoint:** `GET /health`

**Note:** This endpoint is at `/health`, not `/api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T00:00:00.000Z",
  "mongodb": "connected"
}
```

**MongoDB Status Values:**
- `connected` - MongoDB is connected
- `disconnected` - MongoDB is not connected (app still works, but history features disabled)

**Example (cURL):**
```bash
curl http://localhost:5000/health
```

---

## Complete Workflow Example

Here's a complete example of the transformation workflow:

```javascript
// 1. Upload file
const uploadFormData = new FormData();
uploadFormData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('http://localhost:5000/api/upload-file', {
  method: 'POST',
  body: uploadFormData
});
const { uploadId } = await uploadResponse.json();

// 2. Get preview (optional)
const previewResponse = await fetch(`http://localhost:5000/api/preview/${uploadId}`);
const preview = await previewResponse.json();
console.log('Preview:', preview);

// 3. Upload deposit mapping (optional)
const depositFormData = new FormData();
depositFormData.append('file', depositFileInput.files[0]);

const depositResponse = await fetch('http://localhost:5000/api/upload-deposit-map', {
  method: 'POST',
  body: depositFormData
});
const { depositMapId } = await depositResponse.json();

// 4. Start transformation
const transformResponse = await fetch('http://localhost:5000/api/transform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadId,
    depositMapId,
    outputFormat: 'csv'
  })
});
const { transformId } = await transformResponse.json();

// 5. Poll for status
const pollInterval = setInterval(async () => {
  const statusResponse = await fetch(`http://localhost:5000/api/transform-status/${transformId}`);
  const status = await statusResponse.json();
  
  console.log('Status:', status.status, 'Rows:', status.rowsProcessed);
  
  if (status.status === 'completed') {
    clearInterval(pollInterval);
    
    // 6. Download result
    window.location.href = `http://localhost:5000/api/download/${transformId}`;
  } else if (status.status === 'failed') {
    clearInterval(pollInterval);
    console.error('Transformation failed:', status.error);
  }
}, 2000);
```

---

## Error Handling

### Common Errors

**400 Bad Request - No file uploaded**
```json
{
  "error": "No file uploaded"
}
```

**400 Bad Request - Invalid file type**
```json
{
  "error": "Only CSV and Excel files are allowed"
}
```

**400 Bad Request - File too large**
```json
{
  "error": "File too large"
}
```

**404 Not Found - Upload not found**
```json
{
  "error": "Upload not found"
}
```

**404 Not Found - Transform not found**
```json
{
  "error": "Transform not found"
}
```

**400 Bad Request - Transform not completed**
```json
{
  "error": "Transform not completed yet",
  "status": "processing"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting in production.

## CORS

CORS is enabled for the origin specified in `CORS_ORIGIN` environment variable (default: `http://localhost:5173`).

## File Size Limits

Maximum file size is configurable via `MAX_FILE_SIZE` environment variable (default: 100MB).

## Data Retention

- Uploaded files are stored in the `UPLOAD_DIR` directory
- Transformed files are stored in the same directory
- Files are not automatically deleted
- Use the DELETE endpoint to remove transformations and their files

---

## Testing the API

### Using cURL

```bash
# Upload file
curl -X POST http://localhost:5000/api/upload-file \
  -F "file=@sample.csv"

# Get preview
curl http://localhost:5000/api/preview/{uploadId}

# Start transformation
curl -X POST http://localhost:5000/api/transform \
  -H "Content-Type: application/json" \
  -d '{"uploadId": "{uploadId}"}'

# Check status
curl http://localhost:5000/api/transform-status/{transformId}

# Download
curl http://localhost:5000/api/download/{transformId} -o output.csv
```

### Using Postman

1. Import the endpoints as a collection
2. Set base URL: `http://localhost:5000/api`
3. For file uploads, use form-data with file type
4. For JSON requests, set Content-Type: application/json

---

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [QUICKSTART.md](../QUICKSTART.md)
- Check sample files in `backend/sample-data/`
