"use strict";

/**
 * AWS Services Index
 * Central export for all AWS service integrations.
 */

module.exports = {
  s3Service: require("./s3.service"),
  secretsManagerService: require("./secretsManager.service"),
  parameterStoreService: require("./parameterStore.service"),
  snsService: require("./sns.service"),
  sqsService: require("./sqs.service"),
};
