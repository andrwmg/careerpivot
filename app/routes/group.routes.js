const groups = require("../controllers/group.controller.js");
const router = require("express").Router();
const {isLoggedIn, isPostAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", isLoggedIn, groups.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", groups.findSome);

router.get('/users/:userId', groups.findMyGroups)

router.get('/career/:career', groups.findPopular)

router.put('/:groupId/members', groups.join)

router.get("/:groupId", groups.findOne);

router.put("/:groupId", isLoggedIn, isPostAuthor, groups.update);

router.delete("/:groupId", isLoggedIn, groups.delete);

router.get("/:groupId/likes/:userId", groups.like)

router.get("/:groupId/dislikes/:userId", groups.dislike)

module.exports = router