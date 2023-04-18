const express = require('express')
const router = express.Router({ mergeParams: true });
const { isLoggedIn, isLoggedInTwo } = require('../../middleware');
const users = require('../controllers/user.controller');
const multer = require('multer')
const {storage} = require('../cloudinary');
const upload = multer({storage})

router.post('/register', users.register)

router.post('/login', users.login) 

router.post('/getUser', isLoggedIn, users.getUser)

router.post('/verify', users.verify)

router.post('/resend', users.resend)

router.post('/forgot', users.forgot)

router.get('/reset/:token', users.setToken)

router.post('/reset', users.reset)

router.put('/updateUser/:id', users.updateUser)

router.put('/messages/:fromId/:toId', isLoggedIn, users.sendMessage)

router.post('/upload',upload.array('images'),(req,res)=>{
    res.send(req.files.map(img => ({ filename: img.filename, url: img.path })))
  })

router.get('/logout', users.logout)

module.exports = router
