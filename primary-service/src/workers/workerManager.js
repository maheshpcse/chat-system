"use strict";

/**
 * Worker Thread Manager
 * Utility for spawning and managing worker threads.
 *
 * WHY WORKER THREADS:
 * Node.js is single-threaded. CPU-intensive operations (file processing,
 * data exports, analytics calculations) would block the event loop,
 * making the server unresponsive to other requests.
 *
 * Worker threads run JavaScript in parallel threads, sharing memory
 * via SharedArrayBuffer or passing data via structured clone.
 *
 * USE CASES in this chat app:
 * - Processing large file uploads (resizing, compression)
 * - Exporting chat history to CSV/PDF
 * - Calculating analytics (message counts, active users)
 * - Generating reports
 */

const { Worker } = require("worker_threads");
const path = require("path");
const logger = require("../utils/logger");

/**
 * Runs a worker thread and returns a Promise that resolves with the result.
 * HIGHER ORDER FUNCTION - wraps worker thread lifecycle management.
 *
 * @param {string} workerFile - Path to the worker script (relative to workers/)
 * @param {Object} workerData - Data to pass to the worker
 * @param {Object} options - Worker options
 * @returns {Promise<*>} Result from the worker thread
 */
const runWorker = (workerFile, workerData = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, workerFile);

    const worker = new Worker(workerPath, {
      workerData,
      ...options,
    });

    worker.on("message", (result) => {
      logger.debug("Worker completed", { workerFile, success: true });
      resolve(result);
    });

    worker.on("error", (error) => {
      logger.error("Worker error", { workerFile, error: error.message });
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
};

/**
 * Creates a reusable worker factory (CURRYING pattern).
 * Returns a function pre-configured for a specific worker type.
 *
 * @param {string} workerFile - Worker script filename
 * @returns {Function} Pre-configured worker launcher
 *
 * @example
 * const processFile = createWorkerFactory("fileProcessor.worker.js");
 * const result = await processFile({ filePath: "/uploads/image.jpg", action: "resize" });
 */
const createWorkerFactory = (workerFile) => {
  return (workerData, options) => runWorker(workerFile, workerData, options);
};

// Pre-configured worker factories
const processFile = createWorkerFactory("fileProcessor.worker.js");
const exportChat = createWorkerFactory("chatExport.worker.js");
const calculateAnalytics = createWorkerFactory("analytics.worker.js");

module.exports = {
  runWorker,
  createWorkerFactory,
  processFile,
  exportChat,
  calculateAnalytics,
};
