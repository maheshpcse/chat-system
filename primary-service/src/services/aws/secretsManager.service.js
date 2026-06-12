"use strict";

/**
 * AWS Secrets Manager Service
 * Retrieves application secrets from AWS Secrets Manager.
 * Use for: database credentials, API keys, encryption keys in production.
 */

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { config } = require("../../config/environment");
const logger = require("../../utils/logger");

class SecretsManagerService {
  constructor() {
    this.client = new SecretsManagerClient({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined,
    });
    this.cache = new Map(); // In-memory cache for secrets
  }

  /**
   * Retrieves a secret value by name.
   * Caches the secret in memory to avoid repeated API calls.
   * @param {string} secretName - Name or ARN of the secret
   * @returns {Promise<Object>} Parsed secret value
   */
  async getSecret(secretName = config.aws.secretName) {
    // Check cache first
    if (this.cache.has(secretName)) {
      return this.cache.get(secretName);
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);

    let secretValue;
    if (response.SecretString) {
      secretValue = JSON.parse(response.SecretString);
    } else {
      const buffer = Buffer.from(response.SecretBinary, "base64");
      secretValue = JSON.parse(buffer.toString("utf8"));
    }

    // Cache the secret
    this.cache.set(secretName, secretValue);
    logger.info("Secret retrieved from AWS Secrets Manager", { secretName });

    return secretValue;
  }

  /**
   * Clears the secrets cache (e.g., for rotation).
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new SecretsManagerService();
