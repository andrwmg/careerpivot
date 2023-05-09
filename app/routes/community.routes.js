const communities = require("../controllers/community.controller.js");
const router = require("express").Router();
const {isLoggedIn, isPostAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", isLoggedIn, communities.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", communities.findSome);

router.get('/users/:userId', communities.findMyCommunites)

router.get("/:postId", communities.findOne);

router.put("/:postId", isLoggedIn, isPostAuthor, communities.update);

router.delete("/:postId", isLoggedIn, communities.delete);

router.get("/:postId/likes/:userId", communities.like)

router.get("/:postId/dislikes/:userId", communities.dislike)

module.exports = router