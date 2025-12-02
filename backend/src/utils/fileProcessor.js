/**
 * File processing utilities for CSV and Excel files
 * Supports streaming for large files
 */

import fs from 'fs';
import csvParser from 'csv-parser';
import { parse } from 'fast-csv';
import XLSX from 'xlsx';
import { Readable } from 'stream';

/**
 * Parse Excel file and return rows
 * @param {string} filePath - Path to Excel file
 * @param {number} limit - Max rows to read (0 = all)
 * @returns {Promise<Object[]>} - Array of row objects
 */
export async function parseExcelFile(filePath, limit = 0) {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            let rows = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',
                raw: false // Keep as strings to preserve formatting
            });

            if (limit > 0) {
                rows = rows.slice(0, limit);
            }

            resolve(rows);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Parse CSV file and return rows
 * @param {string} filePath - Path to CSV file
 * @param {number} limit - Max rows to read (0 = all)
 * @returns {Promise<Object[]>} - Array of row objects
 */
export async function parseCSVFile(filePath, limit = 0) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let count = 0;

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                if (limit === 0 || count < limit) {
                    rows.push(row);
                    count++;
                }
            })
            .on('end', () => {
                resolve(rows);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

/**
 * Stream process CSV file with transformation
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {Function} transformFn - Transform function (row) => {transformedRow, warnings}
 * @param {Function} progressCallback - Progress callback (processed, total)
 * @returns {Promise<{processed: number, warnings: string[]}>}
 */
export async function streamProcessCSV(inputPath, outputPath, transformFn, progressCallback = null) {
    return new Promise((resolve, reject) => {
        const warnings = [];
        let processed = 0;
        let isFirstRow = true;

        const writeStream = fs.createWriteStream(outputPath);
        const csvStream = parse({ headers: true });

        csvStream
            .on('data', (row) => {
                const result = transformFn(row);

                // Write header on first row
                if (isFirstRow) {
                    const headers = Object.keys(result.transformedRow);
                    writeStream.write(headers.join(',') + '\n');
                    isFirstRow = false;
                }

                // Write data row
                const values = Object.values(result.transformedRow).map(v => {
                    // Escape commas and quotes
                    const str = String(v || '');
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                });
                writeStream.write(values.join(',') + '\n');

                // Collect warnings
                if (result.warnings && result.warnings.length > 0) {
                    warnings.push(...result.warnings.map(w => `Row ${processed + 1}: ${w}`));
                }

                processed++;

                if (progressCallback) {
                    progressCallback(processed);
                }
            })
            .on('end', () => {
                writeStream.end();
                resolve({ processed, warnings });
            })
            .on('error', (error) => {
                writeStream.end();
                reject(error);
            });

        fs.createReadStream(inputPath).pipe(csvStream);
    });
}

/**
 * Stream process Excel file with transformation
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {Function} transformFn - Transform function
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<{processed: number, warnings: string[]}>}
 */
export async function streamProcessExcel(inputPath, outputPath, transformFn, progressCallback = null) {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(inputPath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const rows = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',
                raw: false
            });

            const transformedRows = [];
            const warnings = [];

            rows.forEach((row, index) => {
                const result = transformFn(row);
                transformedRows.push(result.transformedRow);

                if (result.warnings && result.warnings.length > 0) {
                    warnings.push(...result.warnings.map(w => `Row ${index + 1}: ${w}`));
                }

                if (progressCallback) {
                    progressCallback(index + 1);
                }
            });

            // Check if output should be Excel
            const outputExt = outputPath.split('.').pop().toLowerCase();
            if (outputExt === 'xlsx' || outputExt === 'xls') {
                const worksheet = XLSX.utils.json_to_sheet(transformedRows);
                const newWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");
                XLSX.writeFile(newWorkbook, outputPath);

                resolve({ processed: rows.length, warnings });
                return;
            }

            // Write to CSV
            const writeStream = fs.createWriteStream(outputPath);

            if (transformedRows.length > 0) {
                // Write header
                const headers = Object.keys(transformedRows[0]);
                writeStream.write(headers.join(',') + '\n');

                // Write rows
                transformedRows.forEach(row => {
                    const values = Object.values(row).map(v => {
                        const str = String(v || '');
                        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                            return `"${str.replace(/"/g, '""')}"`;
                        }
                        return str;
                    });
                    writeStream.write(values.join(',') + '\n');
                });
            }

            writeStream.end();

            resolve({ processed: rows.length, warnings });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get file type from extension
 * @param {string} filename - Filename
 * @returns {string} - 'csv', 'excel', or 'unknown'
 */
export function getFileType(filename) {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'excel';

    return 'unknown';
}

/**
 * Parse file (auto-detect type)
 * @param {string} filePath - File path
 * @param {number} limit - Max rows
 * @returns {Promise<Object[]>}
 */
export async function parseFile(filePath, limit = 0) {
    const fileType = getFileType(filePath);

    if (fileType === 'csv') {
        return parseCSVFile(filePath, limit);
    } else if (fileType === 'excel') {
        return parseExcelFile(filePath, limit);
    } else {
        throw new Error('Unsupported file type');
    }
}

/**
 * Stream process file (auto-detect type)
 * @param {string} inputPath - Input path
 * @param {string} outputPath - Output path
 * @param {Function} transformFn - Transform function
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<{processed: number, warnings: string[]}>}
 */
export async function streamProcessFile(inputPath, outputPath, transformFn, progressCallback = null) {
    const fileType = getFileType(inputPath);

    if (fileType === 'csv') {
        return streamProcessCSV(inputPath, outputPath, transformFn, progressCallback);
    } else if (fileType === 'excel') {
        return streamProcessExcel(inputPath, outputPath, transformFn, progressCallback);
    } else {
        throw new Error('Unsupported file type');
    }
}
