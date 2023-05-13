const careers = require("../controllers/career.controller.js");
const router = require("express").Router();
const {isLoggedIn, isPostAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", isLoggedIn, careers.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", careers.findSome);

router.get('/users/:userId', careers.findMyGroups)

router.get('/career/:career', careers.findPopular)

router.put('/:communityId/members', careers.join)

router.get("/:communityId", careers.findOne);

router.put("/:communityId", isLoggedIn, isPostAuthor, careers.update);

router.delete("/:communityId", isLoggedIn, careers.delete);

router.get("/:communityId/likes/:userId", careers.like)

router.get("/:communityId/dislikes/:userId", careers.dislike)

module.exports = router