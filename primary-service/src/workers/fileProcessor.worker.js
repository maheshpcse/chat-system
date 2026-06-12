"use strict";

/**
 * File Processor Worker Thread
 * Handles CPU-intensive file operations without blocking the main event loop.
 *
 * Operations: image resize, file compression, metadata extraction
 */

const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Main worker execution.
 * Receives instructions via workerData, processes, and posts result back.
 */
const processFile = () => {
  const { filePath, action, options = {} } = workerData;

  const actions = {
    checksum: () => calculateChecksum(filePath),
    metadata: () => extractMetadata(filePath),
    compress: () => compressFile(filePath, options),
  };

  const handler = actions[action];
  if (!handler) {
    parentPort.postMessage({ success: false, error: `Unknown action: ${action}` });
    return;
  }

  try {
    const result = handler();
    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
};

/**
 * Calculates SHA-256 checksum of a file.
 * CPU-intensive for large files - perfect for worker thread.
 */
const calculateChecksum = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return { filePath, checksum: hash, algorithm: "sha256" };
};

/**
 * Extracts file metadata.
 */
const extractMetadata = (filePath) => {
  const stats = fs.statSync(filePath);
  return {
    filePath,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    extension: path.extname(filePath),
    name: path.basename(filePath),
  };
};

/**
 * Placeholder for file compression.
 * In production, would use zlib or sharp for images.
 */
const compressFile = (filePath, options) => {
  // Simulates CPU-intensive compression work
  const fileBuffer = fs.readFileSync(filePath);
  return {
    originalSize: fileBuffer.length,
    compressedSize: fileBuffer.length, // Placeholder
    ratio: 1.0,
    filePath,
  };
};

// Execute worker
processFile();
