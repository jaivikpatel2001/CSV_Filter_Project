/**
 * Upload Page Component
 * Drag & drop file upload with preview
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../services/api';

const UploadPage = () => {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setError(null);

        try {
            const response = await uploadFile(file);
            // Navigate to preview page with uploadId
            navigate(`/preview/${response.uploadId}`);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    }, [navigate]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        multiple: false,
        disabled: uploading,
    });

    return (
        <div className="container container-sm section">
            <div className="text-center mb-xl">
                <h1>CSV/Excel Transformer</h1>
                <p className="text-secondary">
                    Upload your CSV or Excel file to transform it according to business rules
                </p>
            </div>

            <div className="card card-elevated">
                <div
                    {...getRootProps()}
                    className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
                >
                    <input {...getInputProps()} />

                    <div className="dropzone-icon">
                        {uploading ? '⏳' : '📁'}
                    </div>

                    {uploading ? (
                        <>
                            <div className="dropzone-text">Uploading...</div>
                            <div className="spinner" style={{ margin: '20px auto' }}></div>
                        </>
                    ) : (
                        <>
                            <div className="dropzone-text">
                                {isDragActive
                                    ? 'Drop the file here'
                                    : 'Drag & drop a file here, or click to select'}
                            </div>
                            <div className="dropzone-hint">
                                Supports CSV, XLS, and XLSX files (max 100MB)
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div className="alert alert-error mt-lg">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>

            <div className="card mt-xl">
                <div className="card-header">
                    <h3 className="card-title">What happens next?</h3>
                </div>

                <div className="grid grid-3">
                    <div className="text-center">
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👁️</div>
                        <h4>1. Preview</h4>
                        <p className="text-secondary">
                            Review the first 50 rows and see which columns will be transformed
                        </p>
                    </div>

                    <div className="text-center">
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
                        <h4>2. Transform</h4>
                        <p className="text-secondary">
                            Apply business rules and transformations to your data
                        </p>
                    </div>

                    <div className="text-center">
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⬇️</div>
                        <h4>3. Download</h4>
                        <p className="text-secondary">
                            Download the transformed CSV file ready for import
                        </p>
                    </div>
                </div>
            </div>

            <div className="card mt-xl">
                <div className="card-header">
                    <h3 className="card-title">Transformation Rules</h3>
                </div>

                <div className="grid grid-2">
                    <div>
                        <h5>Columns Removed</h5>
                        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            <li>Status, CaseUPC, MANUFACTURER</li>
                            <li>REG_MULTIPLE, CASE_RETAIL</li>
                            <li>TAX2, TAX3, CASE_DEPOSIT</li>
                            <li>PRC_GRP, FUTURE_*, BRAND</li>
                            <li>PBHN, CLASS</li>
                        </ul>
                    </div>

                    <div>
                        <h5>Transformations Applied</h5>
                        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            <li>UPC: Remove one leading zero</li>
                            <li>TAX1: Y→1, N→empty</li>
                            <li>Dates: Normalized to YYYY-MM-DD</li>
                            <li>SALE/TPR: Special pricing logic</li>
                            <li>BOTTLE_DEPOSIT: Mapped from deposit file</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
