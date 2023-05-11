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

router.get('/career/:career', communities.findPopular)

router.put('/:communityId/members', communities.join)

router.get("/:communityId", communities.findOne);

router.put("/:communityId", isLoggedIn, isPostAuthor, communities.update);

router.delete("/:communityId", isLoggedIn, communities.delete);

router.get("/:communityId/likes/:userId", communities.like)

router.get("/:communityId/dislikes/:userId", communities.dislike)

module.exports = router