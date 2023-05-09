const { isLoggedIn } = require("../../middleware.js");
const comments = require("../controllers/comment.controller.js");

const router = require("express").Router();

// // Create a new Tutorial
router.post("/:postId/comments", isLoggedIn, comments.create);


router.post("/:postId/comments/:commentId", isLoggedIn, comments.reply);

// // Retrieve all comments for a post
router.get("/:postId/comments", comments.findComments);

// // Retrieve all published Tutorials
// router.get("/published", comments.findAllPublished);

// // Retrieve a single Tutorial with id
router.get("/:postId/comments/:commentId", comments.findReplies);

// // Update a Tutorial with id
// router.put("/:id", comments.update);

// // Delete a Tutorial with id
router.delete("/:postId/comments/:commentId", isLoggedIn, comments.delete);

// // Create a new Tutorial
// router.delete("/", comments.deleteAll);

module.exports = router