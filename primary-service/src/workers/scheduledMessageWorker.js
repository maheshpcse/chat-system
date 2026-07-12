"use strict";

/**
 * Scheduled Message Worker
 * Polls for due scheduled messages and sends them via ChatService.
 * Runs on a configurable interval (default: 30 seconds).
 *
 * Design Pattern: Worker/Poller with error isolation per message.
 */

const scheduledMessageRepository = require("../modules/scheduled-message/scheduled-message.repository");
const { getIO } = require("../config/socket");
const logger = require("../utils/logger");

const POLL_INTERVAL = parseInt(process.env.SCHEDULED_MSG_POLL_MS) || 30000;

let intervalHandle = null;

/**
 * Process a single due scheduled message.
 * Sends it to the conversation via Socket.IO, then marks status as 'sent'.
 */
async function processMessage(msg) {
  try {
    const io = getIO();

    // Emit the message as if the sender just typed it
    io.to(`conversation:${msg.conversation_id}`).emit("newMessage", {
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      senderFirstName: msg.sender_first_name,
      content: msg.content,
      messageType: msg.message_type,
      fileUrl: msg.file_url,
      createdAt: new Date().toISOString(),
      isScheduled: true,
    });

    // Mark as sent
    await scheduledMessageRepository.updateStatus(msg.id, "sent");
    logger.info(`Scheduled message ${msg.id} sent successfully`);
  } catch (error) {
    logger.error(`Failed to send scheduled message ${msg.id}:`, error.message);
    await scheduledMessageRepository.updateStatus(msg.id, "failed");
  }
}

/**
 * Poll for due messages and process them.
 */
async function pollDueMessages() {
  try {
    const dueMessages = await scheduledMessageRepository.getDueMessages();

    if (dueMessages.length > 0) {
      logger.info(`Processing ${dueMessages.length} due scheduled messages`);
      // Process each message independently (error in one doesn't block others)
      await Promise.allSettled(dueMessages.map(processMessage));
    }
  } catch (error) {
    logger.error("Scheduled message poll failed:", error.message);
  }
}

/**
 * Start the scheduled message worker.
 */
function startWorker() {
  if (intervalHandle) {
    logger.warn("Scheduled message worker already running");
    return;
  }

  logger.info(
    `Starting scheduled message worker (poll every ${POLL_INTERVAL}ms)`
  );
  intervalHandle = setInterval(pollDueMessages, POLL_INTERVAL);

  // Run immediately on start
  pollDueMessages();
}

/**
 * Stop the scheduled message worker.
 */
function stopWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Scheduled message worker stopped");
  }
}

module.exports = { startWorker, stopWorker };
