"use strict";

/**
 * MySQL Database Configuration
 * Creates and manages a connection pool using mysql2 with Promise support.
 * All database access goes through stored procedures.
 */

const mysql = require("mysql2/promise");
const { config } = require("./environment");
const logger = require("../utils/logger");

let pool = null;

/**
 * Creates MySQL connection pool with configured settings.
 * Uses connection pooling for performance and resource management.
 */
const createPool = () => {
  if (pool) return pool;

  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    connectionLimit: config.mysql.connectionLimit,
    queueLimit: config.mysql.queueLimit,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    multipleStatements: false,
    dateStrings: true,
    timezone: "+00:00",
  });

  pool.on("connection", () => {
    logger.info("MySQL pool: New connection established");
  });

  return pool;
};

/**
 * Executes a stored procedure with given parameters.
 * This is the PRIMARY method for all database operations.
 *
 * @param {string} procedureName - Name of the stored procedure
 * @param {Array} params - Parameters to pass to the stored procedure
 * @returns {Promise<Object>} - Result set from the stored procedure
 */
const callProcedure = async (procedureName, params = []) => {
  const connection = await getPool().getConnection();
  try {
    const placeholders = params.map(() => "?").join(", ");
    const query = `CALL ${procedureName}(${placeholders})`;
    logger.info('Stored Procedure Query:', query);
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    logger.error(`Stored Procedure Error [${procedureName}]:`, error.message);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Gets the connection pool, creating it if necessary.
 * @returns {Object} MySQL connection pool
 */
const getPool = () => {
  if (!pool) {
    createPool();
  }
  return pool;
};

/**
 * Tests the database connection.
 * @returns {Promise<boolean>} True if connection is successful
 */
const testConnection = async () => {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    logger.info("MySQL connection test successful");
    return true;
  } catch (error) {
    logger.error("MySQL connection test failed:", error.message);
    throw error;
  }
};

/**
 * Gracefully closes all connections in the pool.
 */
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("MySQL pool closed");
  }
};

module.exports = {
  createPool,
  getPool,
  callProcedure,
  testConnection,
  closePool,
};
