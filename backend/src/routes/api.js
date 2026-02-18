/**
 * API routes for file upload, preview, transform, and history
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Transform, DepositMap } from '../models/models.js';
import { parseFile, streamProcessFile, getFileType } from '../utils/fileProcessor.js';
import { transformRow, getOutputColumns, getAvailableVendors, getDefaultVendor } from '../utils/transformer.js';
import mongoose from 'mongoose';
import { memoryStore } from '../utils/memoryStore.js';

const router = express.Router();

// Helper to check DB connection
const isDbConnected = () => mongoose.connection.readyState === 1;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.csv', '.xlsx', '.xls'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    }
});

/**
 * GET /api/vendors
 * Get list of available vendors
 */
router.get('/vendors', async (req, res) => {
    try {
        const vendors = getAvailableVendors();
        res.json({
            vendors,
            defaultVendor: getDefaultVendor()
        });
    } catch (error) {
        console.error('Vendors error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/upload-file
 * Upload a CSV/Excel file for transformation
 * Body: { vendorId?: string } (optional, defaults to AGNE)
 */
router.post('/upload-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadId = uuidv4();
        const fileType = getFileType(req.file.originalname);
        const vendorId = req.body.vendorId || getDefaultVendor();

        // Parse preview (first 50 rows)
        const preview = await parseFile(req.file.path, 50);
        const columns = preview.length > 0 ? Object.keys(preview[0]) : [];

        // Create upload record with vendor info
        const uploadRecord = new Upload({
            uploadId,
            filename: req.file.originalname,
            originalPath: req.file.path,
            fileType,
            fileSize: req.file.size,
            rowCount: preview.length, // Approximate for preview
            columns,
            preview,
            vendorId,
            status: 'previewed'
        });

        if (isDbConnected()) {
            await uploadRecord.save();
        } else {
            console.warn('MongoDB not connected, saving to memory store');
            await memoryStore.save('Upload', uploadRecord);
        }

        res.json({
            uploadId,
            filename: req.file.originalname,
            fileType,
            fileSize: req.file.size,
            preview,
            columns,
            vendorId,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/preview/:uploadId
 * Get preview of uploaded file
 */
router.get('/preview/:uploadId', async (req, res) => {
    try {
        const { uploadId } = req.params;

        let uploadRecord;
        if (isDbConnected()) {
            uploadRecord = await Upload.findOne({ uploadId });
        } else {
            uploadRecord = memoryStore.findOne('Upload', { uploadId });
        }

        if (!uploadRecord) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        const vendorId = uploadRecord.vendorId || getDefaultVendor();

        res.json({
            uploadId: uploadRecord.uploadId,
            filename: uploadRecord.filename,
            fileType: uploadRecord.fileType,
            fileSize: uploadRecord.fileSize,
            columns: uploadRecord.columns,
            preview: uploadRecord.preview,
            vendorId,
            outputColumns: getOutputColumns(vendorId)
        });
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/transform
 * Transform uploaded file
 */
router.post('/transform', async (req, res) => {
    try {
        const { uploadId, outputFormat = 'csv' } = req.body;

        if (!uploadId) {
            return res.status(400).json({ error: 'uploadId is required' });
        }

        let uploadRecord;
        if (isDbConnected()) {
            uploadRecord = await Upload.findOne({ uploadId });
        } else {
            uploadRecord = memoryStore.findOne('Upload', { uploadId });
        }

        if (!uploadRecord) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        const vendorId = uploadRecord.vendorId || getDefaultVendor();

        // Load deposit mapping from hardcoded file
        let depositMapping = {};
        try {
            const depositMappingPath = path.join(process.cwd(), 'sample-data', 'deposit-mapping.csv');
            if (fs.existsSync(depositMappingPath)) {
                const rows = await parseFile(depositMappingPath);

                rows.forEach(row => {
                    // New format: Id, Name, Amount
                    const id = row.Id || row.ID || row.id;
                    const amount = row.Amount || row.amount || row.AMOUNT;

                    // Map Amount -> Id (for replacing amounts with IDs)
                    if (amount && id) {
                        // Normalize amount to handle different formats (0.05, .05, etc.)
                        const normalizedAmount = parseFloat(amount).toString();
                        depositMapping[normalizedAmount] = id;
                        // Also store with original format
                        depositMapping[amount.toString().trim()] = id;
                    }
                });

                console.log(`Loaded ${Object.keys(depositMapping).length / 2} deposit mappings from hardcoded file`);
            } else {
                console.warn('Deposit mapping file not found at:', depositMappingPath);
            }
        } catch (error) {
            console.error('Error loading deposit mapping:', error);
            // Continue without deposit mapping
        }

        // Create transform record
        // Always output CSV format regardless of input file type
        const finalOutputFormat = 'csv';

        // Generate timestamp for filename: export_<timestamp>.csv
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        const transformId = uuidv4();
        const outputDir = process.env.UPLOAD_DIR || './uploads';
        const outputPath = path.join(outputDir, `export_${timestamp}_${transformId}.csv`);

        const transformRecord = new Transform({
            transformId,
            uploadId,
            outputPath,
            outputFormat: finalOutputFormat,
            vendorId,
            status: 'processing'
        });

        if (isDbConnected()) {
            await transformRecord.save();
        } else {
            await memoryStore.save('Transform', transformRecord);
        }

        // Start transformation (async)
        setImmediate(async () => {
            try {
                const result = await streamProcessFile(
                    uploadRecord.originalPath,
                    outputPath,
                    (row) => transformRow(row, depositMapping, { vendorId }),
                    (processed) => {
                        // Progress callback (could emit via WebSocket)
                        console.log(`Processed ${processed} rows`);
                    }
                );

                transformRecord.status = 'completed';
                transformRecord.rowsProcessed = result.processed;
                transformRecord.warnings = result.warnings;
                transformRecord.completedAt = new Date();
                if (isDbConnected()) {
                    await transformRecord.save();
                    await uploadRecord.save();
                } else {
                    // Update objects in memory store
                    await memoryStore.save('Transform', transformRecord);
                    await memoryStore.save('Upload', uploadRecord);
                }
            } catch (error) {
                console.error('Transform error:', error);
                transformRecord.status = 'failed';
                transformRecord.error = error.message;

                if (isDbConnected()) {
                    await transformRecord.save();
                } else {
                    await memoryStore.save('Transform', transformRecord);
                }
            }
        });

        res.json({
            transformId,
            vendorId,
            message: 'Transformation started',
            status: 'processing'
        });
    } catch (error) {
        console.error('Transform initiation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/transform-status/:transformId
 * Get transformation status
 */
router.get('/transform-status/:transformId', async (req, res) => {
    try {
        const { transformId } = req.params;

        let transformRecord;
        if (isDbConnected()) {
            transformRecord = await Transform.findOne({ transformId });
        } else {
            transformRecord = memoryStore.findOne('Transform', { transformId });
        }

        if (!transformRecord) {
            return res.status(404).json({ error: 'Transform not found' });
        }

        res.json({
            transformId: transformRecord.transformId,
            status: transformRecord.status,
            rowsProcessed: transformRecord.rowsProcessed,
            warnings: transformRecord.warnings,
            error: transformRecord.error,
            createdAt: transformRecord.createdAt,
            completedAt: transformRecord.completedAt
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/download/:transformId
 * Download transformed file
 */
router.get('/download/:transformId', async (req, res) => {
    try {
        const { transformId } = req.params;

        let transformRecord;
        if (isDbConnected()) {
            transformRecord = await Transform.findOne({ transformId });
        } else {
            transformRecord = memoryStore.findOne('Transform', { transformId });
        }

        if (!transformRecord) {
            return res.status(404).json({ error: 'Transform not found' });
        }

        if (transformRecord.status !== 'completed') {
            return res.status(400).json({
                error: 'Transform not completed yet',
                status: transformRecord.status
            });
        }

        if (!fs.existsSync(transformRecord.outputPath)) {
            return res.status(404).json({ error: 'Output file not found' });
        }

        // Always output CSV format with timestamp-based filename
        // Extract timestamp from output path if available, otherwise generate new one
        const outputBasename = path.basename(transformRecord.outputPath);
        const timestampMatch = outputBasename.match(/export_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        const timestamp = timestampMatch
            ? timestampMatch[1]
            : new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        const filename = `export_${timestamp}.csv`;

        res.download(transformRecord.outputPath, filename);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/upload-deposit-map
 * Upload deposit mapping file
 */
router.post('/upload-deposit-map', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const depositMapId = uuidv4();

        // Parse deposit mapping file
        // Expected columns: Id, Name, Amount (from deposit-mapping.csv)
        // OR: UPC, Item, DepositPrice, DepositID (legacy format)
        const rows = await parseFile(req.file.path);

        const mappings = new Map();

        rows.forEach(row => {
            // New format: Id, Name, Amount
            const id = row.Id || row.ID || row.id;
            const amount = row.Amount || row.amount || row.AMOUNT;

            // Legacy format: UPC, Item, DepositID
            const upc = row.UPC || row.upc;
            const item = row.Item || row.item || row.ITEM;
            const depositId = row.DepositID || row.depositId || row.DEPOSITID || row.DepositPrice;

            // Map Amount -> Id (for replacing amounts with IDs)
            if (amount && id) {
                // Normalize amount to handle different formats (0.05, .05, etc.)
                const normalizedAmount = parseFloat(amount).toString();
                mappings.set(normalizedAmount, id);
                // Also store with original format
                mappings.set(amount.toString().trim(), id);
            }

            // Legacy mappings: UPC/Item -> DepositID
            if (upc && depositId) {
                mappings.set(upc, depositId);
            }
            if (item && depositId) {
                mappings.set(item, depositId);
            }
        });

        const depositMapRecord = new DepositMap({
            depositMapId,
            filename: req.file.originalname,
            filePath: req.file.path,
            mappings,
            totalMappings: mappings.size
        });

        if (isDbConnected()) {
            await depositMapRecord.save();
        } else {
            await memoryStore.save('DepositMap', depositMapRecord);
        }

        res.json({
            depositMapId,
            filename: req.file.originalname,
            totalMappings: mappings.size,
            message: 'Deposit mapping uploaded successfully'
        });
    } catch (error) {
        console.error('Deposit map upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/deposit-maps
 * List all deposit mappings
 */
router.get('/deposit-maps', async (req, res) => {
    try {
        let depositMaps;
        if (isDbConnected()) {
            depositMaps = await DepositMap.find()
                .select('depositMapId filename totalMappings createdAt')
                .sort({ createdAt: -1 });
        } else {
            depositMaps = memoryStore.find('DepositMap');
        }

        res.json(depositMaps);
    } catch (error) {
        console.error('List deposit maps error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/history
 * Get transformation history
 */
router.get('/history', async (req, res) => {
    try {
        let transforms;
        if (isDbConnected()) {
            transforms = await Transform.find()
                .sort({ createdAt: -1 })
                .limit(50);
        } else {
            transforms = memoryStore.find('Transform').slice(0, 50);
        }

        const history = await Promise.all(
            transforms.map(async (transform) => {
                let upload;
                if (isDbConnected()) {
                    upload = await Upload.findOne({ uploadId: transform.uploadId });
                } else {
                    upload = memoryStore.findOne('Upload', { uploadId: transform.uploadId });
                }
                return {
                    transformId: transform.transformId,
                    uploadId: transform.uploadId,
                    filename: upload ? upload.filename : 'Unknown',
                    status: transform.status,
                    rowsProcessed: transform.rowsProcessed,
                    warningCount: transform.warnings ? transform.warnings.length : 0,
                    createdAt: transform.createdAt,
                    completedAt: transform.completedAt
                };
            })
        );

        res.json(history);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/transform/:transformId
 * Delete a transform and its output file
 */
router.delete('/transform/:transformId', async (req, res) => {
    try {
        const { transformId } = req.params;

        let transformRecord;
        if (isDbConnected()) {
            transformRecord = await Transform.findOne({ transformId });
        } else {
            transformRecord = memoryStore.findOne('Transform', { transformId });
        }

        if (!transformRecord) {
            return res.status(404).json({ error: 'Transform not found' });
        }

        // Delete output file
        if (fs.existsSync(transformRecord.outputPath)) {
            fs.unlinkSync(transformRecord.outputPath);
        }

        if (isDbConnected()) {
            await Transform.deleteOne({ transformId });
        } else {
            memoryStore.deleteOne('Transform', { transformId });
        }

        res.json({ message: 'Transform deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
