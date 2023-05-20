    const { isLoggedIn, isLoggedInTwo } = require("../../middleware.js");
const comments = require("../controllers/comment.controller.js");
  
    const router = require("express").Router();
  
    // // Create a new Tutorial
    router.post("/:id/comments", isLoggedIn, comments.create);
  

    router.post("/:id/comments/:commentId", isLoggedIn, comments.reply);

    // // Retrieve all Tutorials
    router.get("/:id/comments", comments.findAll);
  
    // // Retrieve all published Tutorials
    // router.get("/published", comments.findAllPublished);
  
    // // Retrieve a single Tutorial with id
    router.get("/:id/comments/:commentId", comments.findOne);
  
    // // Update a Tutorial with id
    // router.put("/:id", comments.update);
  
    // // Delete a Tutorial with id
    router.delete("/:id/comments/:commentId", isLoggedIn, comments.delete);
  
    // // Create a new Tutorial
    // router.delete("/", comments.deleteAll);
  
module.exports = router