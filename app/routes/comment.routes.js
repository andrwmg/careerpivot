const { isLoggedIn, verifyToken, isCommentAuthor } = require("../../middleware.js");
const comments = require("../controllers/comment.controller.js");

const router = require("express").Router();

// // Create a new comment
router.post("/:postId/comments", verifyToken, comments.create);

// // Reply to a comment
router.post("/:postId/comments/:commentId", verifyToken, comments.reply);

// // Retrieve all comments for a post
router.get("/:postId/comments", comments.findComments);

// // Retrieve all published comments
// router.get("/published", comments.findAllPublished);

// // Retrieve replies for a comment
router.get("/:postId/comments/:commentId", comments.findReplies);

// // Like/unlike a comment
router.get("/:postId/comments/:commentId/likes", verifyToken, comments.like)

// Update a comment with id
router.put("/:postId/comments/:commentId", verifyToken, isCommentAuthor, comments.update);

// // Delete a comment with id
router.delete("/:postId/comments/:commentId", verifyToken, comments.delete);

// // Delete all comments
// router.delete("/", comments.deleteAll);

module.exports = router