const express = require("express");
const router = express.Router();
const DocumentController = require("../controllers/documentController");
const auth = require("../middleware/auth"); // Assuming you have auth middleware

// Use auth middleware if needed, e.g., router.use(auth);

// Get all documents (with filters)
router.get("/", DocumentController.getAll);

// Get single document
router.get("/:id", DocumentController.getById);

// Create or Update document (Upsert)
router.post("/", DocumentController.createOrUpdate);

// Renew document
router.post("/:id/renew", DocumentController.renewDocument);

// Get notification settings for a document
router.get("/:id/notifications", DocumentController.getNotificationSettings);

// Configure notifications for a document
router.post("/:id/notifications", DocumentController.configureNotifications);

// Delete document
router.delete("/:id", DocumentController.delete);

module.exports = router;
