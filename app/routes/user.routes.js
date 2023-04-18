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

// router.post('/login', passport.authenticate('local'), users.login)

// // Retrieve all published Tutorials
router.get('/logout', users.logout)

// app.use('/api/users', router);

module.exports = router
