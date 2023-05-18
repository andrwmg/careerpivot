const groups = require("../controllers/group.controller.js");
const router = require("express").Router();
const {verifyToken, isPostAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", verifyToken, groups.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", groups.findSome);

router.get('/users/:userId', groups.findMyGroups)

router.get('/career/:career', groups.findPopular)

router.put('/:groupId/members', verifyToken, groups.join)

router.get("/:groupId", groups.findOne);

router.put("/:groupId", verifyToken, isPostAuthor, groups.update);

router.delete("/:groupId", verifyToken, groups.delete);

router.get("/:groupId/likes/:userId", verifyToken, groups.like)

router.get("/:groupId/dislikes/:userId", verifyToken, groups.dislike)

module.exports = router