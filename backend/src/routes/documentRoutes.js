const express = require("express");
const router = express.Router();
const DocumentController = require("../controllers/documentController");

// --- Static routes must come before /:id ---

// GET /expiring
router.get("/expiring", DocumentController.getExpiring);

// GET /machine/:machineId
router.get("/machine/:machineId", DocumentController.getByMachine);

// Notification defaults
router.get("/notification-defaults", DocumentController.getNotificationDefaults);
router.put("/notification-defaults", DocumentController.updateNotificationDefaults);

// Notification history (all documents)
router.get("/notification-history", DocumentController.getNotificationHistory);

// Email notification status
router.get("/email-status", DocumentController.getEmailNotificationStatus);

// Bulk renew
router.put("/bulk/renew", DocumentController.bulkRenew);

// Apply / initialize / check notifications
router.post("/apply-default-notifications", DocumentController.applyDefaultNotifications);
router.post("/initialize-notifications", DocumentController.initializeDefaultNotifications);
router.post("/check-notifications", DocumentController.checkNotificationsDue);

// --- Collection routes ---
router.get("/", DocumentController.getAll);
router.post("/", DocumentController.createOrUpdate);

// --- Dynamic :id routes (must be last) ---
router.get("/:id", DocumentController.getById);
router.post("/:id/renew", DocumentController.renewDocument);
router.get("/:id/notifications", DocumentController.getNotificationSettings);
router.post("/:id/notifications", DocumentController.configureNotifications);
router.get("/:id/notification-history", DocumentController.getNotificationHistory);
router.delete("/:id", DocumentController.delete);

module.exports = router;
