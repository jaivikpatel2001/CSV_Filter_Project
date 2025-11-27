/**
 * Deposit Map Upload Page
 * Upload bottle deposit mapping files
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadDepositMap } from '../services/api';

const DepositMapPage = () => {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await uploadDepositMap(file);
            setSuccess(response);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.error || 'Failed to upload deposit mapping');
        } finally {
            setUploading(false);
        }
    }, []);

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
            <div className="flex-between mb-xl">
                <div>
                    <h2>Upload Deposit Mapping</h2>
                    <p className="text-secondary">
                        Upload a file containing bottle deposit mappings
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    ← Back
                </button>
            </div>

            <div className="card card-elevated mb-xl">
                <div
                    {...getRootProps()}
                    className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
                >
                    <input {...getInputProps()} />

                    <div className="dropzone-icon">
                        {uploading ? '⏳' : '🗂️'}
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
                                    : 'Drag & drop deposit mapping file, or click to select'}
                            </div>
                            <div className="dropzone-hint">
                                CSV or Excel file with columns: UPC, Item, DepositPrice, DepositID
                            </div>
                        </>
                    )}
                </div>

                {success && (
                    <div className="alert alert-success mt-lg">
                        <strong>Success!</strong> Uploaded {success.filename} with {success.totalMappings} mappings
                    </div>
                )}

                {error && (
                    <div className="alert alert-error mt-lg">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <h4 className="card-title">File Format Requirements</h4>
                </div>

                <p className="text-secondary mb-md">
                    Your deposit mapping file should contain the following columns:
                </p>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Column Name</th>
                                <th>Description</th>
                                <th>Required</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>UPC</code></td>
                                <td>Product UPC code</td>
                                <td><span className="badge badge-success">Yes</span></td>
                            </tr>
                            <tr>
                                <td><code>Item</code></td>
                                <td>Item name (alternative to UPC)</td>
                                <td><span className="badge badge-warning">Optional</span></td>
                            </tr>
                            <tr>
                                <td><code>DepositPrice</code></td>
                                <td>Deposit price amount</td>
                                <td><span className="badge badge-warning">Optional</span></td>
                            </tr>
                            <tr>
                                <td><code>DepositID</code></td>
                                <td>Deposit ID to use in output</td>
                                <td><span className="badge badge-success">Yes</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-lg">
                    <h5>Example CSV:</h5>
                    <pre style={{
                        background: 'var(--color-bg-tertiary)',
                        padding: 'var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'auto',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)'
                    }}>
                        {`UPC,Item,DepositPrice,DepositID
000987,Soda,0.10,DEP-001
003456,Juice,0.05,DEP-002
007890,Water,0.05,DEP-003`}
                    </pre>
                </div>
            </div>

            {success && (
                <div className="text-center mt-xl">
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Continue to Upload File
                    </button>
                </div>
            )}
        </div>
    );
};

export default DepositMapPage;
