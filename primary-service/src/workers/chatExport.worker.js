"use strict";

/**
 * Chat Export Worker Thread
 * Exports chat conversations to CSV format.
 * Processes large datasets without blocking the main thread.
 */

const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const path = require("path");

const exportChat = () => {
  const { messages, exportFormat, outputPath } = workerData;

  try {
    const exportStrategies = {
      csv: () => exportToCsv(messages, outputPath),
      json: () => exportToJson(messages, outputPath),
      txt: () => exportToText(messages, outputPath),
    };

    const strategy = exportStrategies[exportFormat] || exportStrategies.csv;
    const result = strategy();

    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
};

const exportToCsv = (messages, outputPath) => {
  const headers = "Timestamp,Sender,Message,Type\n";
  const rows = messages.map((msg) => {
    const content = msg.content.replace(/"/g, '""');
    return `"${msg.timestamp}","${msg.senderName}","${content}","${msg.messageType}"`;
  });

  const csvContent = headers + rows.join("\n");
  fs.writeFileSync(outputPath, csvContent, "utf8");

  return {
    outputPath,
    format: "csv",
    messageCount: messages.length,
    fileSize: Buffer.byteLength(csvContent, "utf8"),
  };
};

const exportToJson = (messages, outputPath) => {
  const jsonContent = JSON.stringify(messages, null, 2);
  fs.writeFileSync(outputPath, jsonContent, "utf8");

  return {
    outputPath,
    format: "json",
    messageCount: messages.length,
    fileSize: Buffer.byteLength(jsonContent, "utf8"),
  };
};

const exportToText = (messages, outputPath) => {
  const textContent = messages
    .map((msg) => `[${msg.timestamp}] ${msg.senderName}: ${msg.content}`)
    .join("\n");
  fs.writeFileSync(outputPath, textContent, "utf8");

  return {
    outputPath,
    format: "txt",
    messageCount: messages.length,
    fileSize: Buffer.byteLength(textContent, "utf8"),
  };
};

exportChat();
