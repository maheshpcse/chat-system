"use strict";

/**
 * AWS SQS Service (Optional)
 * Simple Queue Service for async message processing.
 * Use for: chat archival queue, analytics events, email queue.
 */

const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { config } = require("../../config/environment");
const logger = require("../../utils/logger");

class SqsService {
  constructor() {
    this.client = new SQSClient({
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
   * Sends a message to an SQS queue.
   * @param {string} queueUrl - SQS queue URL
   * @param {Object} messageBody - Message payload
   * @param {number} delaySeconds - Delivery delay in seconds
   * @returns {Promise<string>} Message ID
   */
  async sendMessage(queueUrl, messageBody, delaySeconds = 0) {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
      DelaySeconds: delaySeconds,
    });

    const response = await this.client.send(command);
    logger.debug("SQS message sent", { queueUrl, messageId: response.MessageId });
    return response.MessageId;
  }

  /**
   * Receives messages from an SQS queue.
   * @param {string} queueUrl - SQS queue URL
   * @param {number} maxMessages - Maximum messages to receive (1-10)
   * @param {number} waitTime - Long polling wait time in seconds
   * @returns {Promise<Array>} Array of messages
   */
  async receiveMessages(queueUrl, maxMessages = 10, waitTime = 20) {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTime,
    });

    const response = await this.client.send(command);
    return (response.Messages || []).map((msg) => ({
      id: msg.MessageId,
      body: JSON.parse(msg.Body),
      receiptHandle: msg.ReceiptHandle,
    }));
  }

  /**
   * Deletes a processed message from the queue.
   * @param {string} queueUrl - SQS queue URL
   * @param {string} receiptHandle - Message receipt handle
   */
  async deleteMessage(queueUrl, receiptHandle) {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.client.send(command);
  }
}

module.exports = new SqsService();
