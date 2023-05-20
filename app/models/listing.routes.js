const listings = require("../controllers/listing.controller.js");
const router = require("express").Router();
const {isLoggedIn, isAuthor} = require('../../middleware')
const multer = require('multer')
const {storage} = require('../cloudinary');
const { url } = require("../config/db.config.js");
const upload = multer({storage})

router.post("/", isLoggedIn, 
// upload.array('images'), 
listings.create);

router.post('/upload',upload.array('images'),(req,res)=>{
  console.log(req.files.map(img => ({ filename: img.filename, url: img.path })))
  res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
})

router.get("/", listings.findSome);

router.get("/:id", listings.findOne);

router.put("/:id", isLoggedIn, isAuthor, listings.update);

router.delete("/:id", isLoggedIn, isAuthor, listings.delete);

module.exports = router