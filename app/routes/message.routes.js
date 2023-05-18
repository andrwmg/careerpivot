const { verifyToken } = require("../../middleware.js");
const messages = require("../controllers/message.controller.js");

const router = require("express").Router();

// Create a new message
router.post("/", verifyToken, messages.create);

// Get all of user's messages
router.get("/:userId", verifyToken, messages.conversations);

// Get a single message with id
// router.get("/messages/:userId/:messageId", messages.findOne);

// Get all messages between current user and contact
router.get("/:userId/:contactId", verifyToken, messages.findSome);

// Update message to add like
router.put("/:userId/:messageId", verifyToken, messages.update);

// // Delete a specific message
// router.delete("/messages/:userId/:messageId", verifyToken, messages.delete);

// Delete all messages with a contact
router.delete("/:userId/:contactId", verifyToken, messages.deleteAll);

module.exports = router