"use strict";

const { Router } = require("express");
const adminDashboardController = require("./admin-dashboard.controller");
const { authenticateAdmin } = require("../../middleware/adminAuthentication");

const router = Router();

router.use(authenticateAdmin);
router.get("/overview", adminDashboardController.getOverview);

module.exports = router;
