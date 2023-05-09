const { isLoggedIn } = require("../../middleware.js");
const messages = require("../controllers/message.controller.js");

const router = require("express").Router();

// Create a new message
router.post("/", isLoggedIn, messages.create);

// Get all of user's messages
router.get("/:userId", isLoggedIn, messages.conversations);

// Get a single message with id
// router.get("/messages/:userId/:messageId", messages.findOne);

// Get all messages between current user and contact
router.get("/:userId/:contactId", isLoggedIn, messages.findSome);

// Update message to add like
router.put("/:userId/:messageId", isLoggedIn, messages.update);

// // Delete a specific message
// router.delete("/messages/:userId/:messageId", isLoggedIn, messages.delete);

// Delete all messages with a contact
router.delete("/:userId/:contactId", isLoggedIn, messages.deleteAll);

module.exports = router