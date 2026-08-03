"use strict";

/**
 * Seeds default super admin if none exists.
 * Credentials from env: ADMIN_EMAIL / ADMIN_PASSWORD
 * Fallback (dev only): admin@chatapp.com / Admin@12345
 */

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });

exports.seed = async function seed(knex) {
  const email = process.env.ADMIN_EMAIL || "admin@chatapp.com";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

  const existing = await knex("admins").where({ email }).first();
  if (existing) {
    console.log(`[seed] Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, saltRounds);
  const adminId = uuidv4();

  await knex("admins").insert({
    adminId,
    email,
    passwordHash,
    firstName: process.env.ADMIN_FIRST_NAME || "Super",
    lastName: process.env.ADMIN_LAST_NAME || "Admin",
    role: "super_admin",
    status: "active",
  });

  console.log(`[seed] Default admin created: ${email}`);
};
