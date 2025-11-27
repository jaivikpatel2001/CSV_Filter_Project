/**
 * MongoDB models for storing upload history and deposit mappings
 */

import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
    uploadId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    filename: {
        type: String,
        required: true
    },
    originalPath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        enum: ['csv', 'excel'],
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    rowCount: {
        type: Number,
        default: 0
    },
    columns: [{
        type: String
    }],
    preview: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    status: {
        type: String,
        enum: ['uploaded', 'previewed', 'transformed', 'error'],
        default: 'uploaded'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const transformSchema = new mongoose.Schema({
    transformId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    uploadId: {
        type: String,
        required: true,
        ref: 'Upload'
    },
    depositMapId: {
        type: String,
        ref: 'DepositMap'
    },
    outputPath: {
        type: String,
        required: true
    },
    outputFormat: {
        type: String,
        enum: ['csv', 'xlsx'],
        default: 'csv'
    },
    rowsProcessed: {
        type: Number,
        default: 0
    },
    warnings: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    error: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

const depositMapSchema = new mongoose.Schema({
    depositMapId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    filename: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    mappings: {
        type: Map,
        of: String, // UPC/Item -> DepositID
        default: new Map()
    },
    totalMappings: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Upload = mongoose.model('Upload', uploadSchema);
export const Transform = mongoose.model('Transform', transformSchema);
export const DepositMap = mongoose.model('DepositMap', depositMapSchema);
