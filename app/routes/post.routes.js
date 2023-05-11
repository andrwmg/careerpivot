const posts = require("../controllers/post.controller.js");
const router = require("express").Router();
const {isLoggedIn, isPostAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", isLoggedIn, posts.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", posts.findSome);

router.get("/trending", posts.trending)

router.get("/:postId", posts.findOne);

router.put("/:postId", isLoggedIn, isPostAuthor, posts.update);

router.delete("/:postId", isLoggedIn, posts.delete);

router.get("/:postId/likes/:userId", posts.like)

router.get("/:postId/dislikes/:userId", posts.dislike)

module.exports = router