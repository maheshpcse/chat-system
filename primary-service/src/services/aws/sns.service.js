"use strict";

/**
 * AWS SNS Service (Optional)
 * Simple Notification Service for push notifications and alerts.
 * Use for: mobile push notifications, email alerts, SMS.
 */

const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { config } = require("../../config/environment");
const logger = require("../../utils/logger");

class SnsService {
  constructor() {
    this.client = new SNSClient({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined,
    });
  }

  /**
   * Publishes a message to an SNS topic.
   * @param {string} topicArn - SNS topic ARN
   * @param {string} message - Message body
   * @param {string} subject - Message subject (for email subscriptions)
   * @returns {Promise<string>} Message ID
   */
  async publishToTopic(topicArn, message, subject = "") {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: typeof message === "string" ? message : JSON.stringify(message),
      Subject: subject || undefined,
    });

    const response = await this.client.send(command);
    logger.info("SNS message published", { topicArn, messageId: response.MessageId });
    return response.MessageId;
  }

  /**
   * Sends a direct SMS message.
   * @param {string} phoneNumber - Phone number in E.164 format
   * @param {string} message - SMS message body
   */
  async sendSms(phoneNumber, message) {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    });

    const response = await this.client.send(command);
    return response.MessageId;
  }
}

module.exports = new SnsService();
