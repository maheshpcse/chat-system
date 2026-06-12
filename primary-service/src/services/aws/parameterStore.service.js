"use strict";

/**
 * AWS SSM Parameter Store Service
 * Retrieves application configuration parameters.
 * Use for: feature flags, service URLs, non-secret configuration.
 */

const { SSMClient, GetParameterCommand, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");
const { config } = require("../../config/environment");
const logger = require("../../utils/logger");

class ParameterStoreService {
  constructor() {
    this.client = new SSMClient({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined,
    });
    this.cache = new Map();
  }

  /**
   * Gets a single parameter value.
   * @param {string} parameterName - Full parameter path
   * @param {boolean} decrypt - Whether to decrypt SecureString parameters
   * @returns {Promise<string>} Parameter value
   */
  async getParameter(parameterName = config.aws.parameterName, decrypt = true) {
    if (this.cache.has(parameterName)) {
      return this.cache.get(parameterName);
    }

    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: decrypt,
    });

    const response = await this.client.send(command);
    const value = response.Parameter.Value;

    this.cache.set(parameterName, value);
    logger.info("Parameter retrieved from SSM", { parameterName });

    return value;
  }

  /**
   * Gets all parameters under a path prefix.
   * @param {string} pathPrefix - Parameter path prefix
   * @returns {Promise<Object>} Key-value map of parameters
   */
  async getParametersByPath(pathPrefix) {
    const command = new GetParametersByPathCommand({
      Path: pathPrefix,
      Recursive: true,
      WithDecryption: true,
    });

    const response = await this.client.send(command);
    const params = {};

    (response.Parameters || []).forEach((param) => {
      const key = param.Name.replace(pathPrefix, "").replace(/^\//, "");
      params[key] = param.Value;
    });

    return params;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new ParameterStoreService();
