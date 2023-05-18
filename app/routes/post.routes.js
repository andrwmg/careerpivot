const posts = require("../controllers/post.controller.js");
const router = require("express").Router();
const {verifyToken, isPostAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", verifyToken, posts.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", posts.findSome);

router.get("/trending", posts.trending)

router.get('/latest', posts.latest)

router.get("/careers/:career", posts.findSome);

router.get("/:postId", posts.findOne);

router.put("/:postId", verifyToken, isPostAuthor, posts.update);

router.delete("/:postId", verifyToken, posts.delete);

router.get("/:postId/likes/:userId", verifyToken, posts.like)

router.get("/:postId/dislikes/:userId", verifyToken, posts.dislike)

module.exports = router