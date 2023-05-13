const express = require('express');
const db = require('../models/index.js')
const User = db.users
const Community = db.communities
const nodemailer = require('nodemailer')
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt')
const mailjet = require('node-mailjet').connect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY)
const jwt = require('jsonwebtoken');

const saltRounds = Number(process.env.SALT_ROUNDS) || 10

async function sendVerificationEmail(userEmail, verificationToken, type) {

    const baseURL = process.env.LOCAL ? `http://localhost:7071` : 'https://www.careerpivot.io'

    const request = mailjet
        .post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: process.env.MAILJET_EMAIL,
                        Name: 'Andrew at CareerPivot'
                    },
                    To: [
                        {
                            Email: userEmail
                        }
                    ],
                    Subject: type === 'verify' ? 'Account Verification' : 'Reset Password',
                    HTMLPart: type === 'verify' ?
                        `<h3>Hello,</h3>
            <p>Thank you for registering for CareerPivot! To verify your account, please click on the following link:</p>
            <p><a href="${baseURL}/verify/${verificationToken}">Verify Account</a></p>
            <p>If you did not create an account on our service, please disregard this email.</p>`
                        :
                        `<h3>Hello,</h3>
            <p>Thank you for taking steps to get back onto CareerPivot! To reset your password, please click on the following link:</p>
            <p><a href="${baseURL}/reset/${verificationToken}">Reset Password</a></p>
            <p>If you did not create an account on our service, please disregard this email.</p>`
                }
            ]
        })
    request
        .then((result) => {
            console.log(result.body)
        })
        .catch((err) => {
            console.log(err.statusCode)
        })
}

const sgAPI = process.env.SENDGRID_API_KEY

const sgSMTP = process.env.SENDGRID_SMTP
const sgUser = process.env.SENDGRID_USERNAME
const sgPassword = process.env.SENDGRID_PASSWORD

sgMail.setApiKey(sgAPI)

exports.register = async (req, res, err) => {
    try {
        let { email, username } = req.body
        const { password, image } = req.body

        if (!email || !username || !password) {
            return res.status(400).send({ message: 'Email, username, and password fields are required' })
        }
        email = email.toLowerCase()
        const username_lower = username.toLowerCase()

        const existingUser = await User.findOne({ $or: [{ username_lower }, { email }] })
        if (existingUser) {
            res.status(400).send({ message: 'Username or email are already taken' });
            return
        }

        const user = new User({ email, username, image })
        user.generateVerificationToken();
        user.generateLower()

        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        user.password = hash;

        user.save()

        sendVerificationEmail(user.email, user.verificationToken, 'verify')

        res.status(200).send({ message: 'Verification email resent' })
    }
    catch (e) {
        if (e.message.includes('E11000')) {
            res.status(400).send({ message: 'Failed to register user' })
        } else {
            res.status(400).send({ message: e.message });
        }
    }
}

exports.verify = async (req, res, err) => {
    try {
        const { token } = req.params

        await User.findOneAndUpdate({ verificationToken: token }, { isVerified: true, verificationToken: null })
            .then(data => {
                if (!data) {
                    res.status(404).send({ message: 'Invalid verification token' });
                } else {
                    res.status(200).send({ message: 'Account verified' });
                }
            })
    }
    catch (err) {
        console.log(err)
        res.status(400).send({ message: 'Failed to verify account' });
    }
}

exports.resend = async (req, res, err) => {
    try {
        let { email } = req.body
        const { password } = req.body

        if (!email || !password) {
            return res.status(400).send({ message: 'Email and password fields are required' })
        }

        email = email.toLowerCase()

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).send({ message: 'Invalid email or password' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(404).send({ message: 'Invalid email or password' });
        }
        if (user.isVerified) {
            return res.status(400).send({ message: 'Account is already verified' });
        }

        user.generateVerificationToken()

        user.save()

        sendVerificationEmail(user.email, user.verificationToken, 'verify')

        res.status(200).send({ message: 'Verification email resent' })

    } catch (e) {
        if (e.message.includes('E11000')) {
            res.status(400).send({ message: 'Failed to register user' })
        } else {
            res.status(400).send({ message: e.message });
        }
    }
}

exports.login = async (req, res, err) => {
    try {
        let { email } = req.body
        const { password } = req.body

        if (!email || !password) {
            return res.status(400).send({ message: 'Email and password fields are required' })
        }

        email = email.toLowerCase()
        const user = await User.findOne({ email })
            .populate('image')
        if (!user) {
            return res.status(404).send({ message: 'Invalid email or password' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(404).send({ message: 'Invalid email or password' });
        }
        if (!user.isVerified) {
            return res.status(401).send({ message: 'Account not verified' });
        }

        // user.countUnread()
        // await user.save()
        req.session.user = user

        const payload = { email: user.email, username: user.username, image: user.image, career: user.career }

        const token = jwt.sign(payload, process.env.SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: false,
            secure: true,
        });

        console.log(req.cookies)

        res.status(200).json({ user, message: 'Welcome back to Career Pivot!' })

    } catch (err) {
        console.log(err)
        res.status(400).send({ message: 'Login failed' });
    }
}

exports.getUser = async (req, res, err) => {
    try {
        const { id } = req.body
        if (req.session.user && req.session.user._id === id) {
            const user = await User.findById(req.session.user._id)
                .populate({
                    path: 'messages',
                    populate: [
                        { path: 'sender' }, { path: 'recipient' }
                    ]
                })
                .populate({
                    path: 'notifications',
                    populate: { path: 'from' }
                })
            res.status(200).send(user)
        }
    } catch (err) {
        res.status(400).send({ message: 'Could not find user' });
    }
}

exports.forgot = async (req, res, err) => {
    try {

        let { email } = req.body
        if (!email) {
            return res.status(400).send({ message: 'Email is required' })
        }
        email = email.toLowerCase()
        const user = await User.findOne({ email })
        if (!user) {

            res.status(400).send({ message: 'Could not find account with that username' })

        } else {

            console.log(user)
            user.generateResetToken()

            user.save()

            sendVerificationEmail(user.email, user.resetPasswordToken, 'reset')

            res.status(200).json({ message: 'Reset token resent' })

        }
    } catch (err) {
        console.log(err)
        res.status(400).send({ message: 'Failed to send reset password email' });
    }
}

exports.setToken = async (req, res) => {
    try {
        const { token } = req.params

        const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            res.status(400).send({ message: 'Password reset token is invalid or has expired' });
        } else {
            req.session.token = token
            res.status(200).send({ message: 'Token accepted. Reset password now' })
        }
    }
    catch (err) {
        console.log(err)
        return res.status(400).send({ message: 'Failed to reset password' });
    }
}

exports.reset = async (req, res) => {
    try {
        const { token } = req.session
        const { password, confirm } = req.body

        if (!password || !confirm) {
            return res.status(400).send({ message: 'Password and confirm fields are required' })
        }

        const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).send({ message: 'Password reset token is invalid or has expired' });
        } else {

            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) {
                    return next(err);
                } else { }
                bcrypt.hash(password, salt, (err, hash) => {
                    user.password = hash;
                    user.resetPasswordToken = null;
                    user.resetPasswordExpires = null;
                    user.save()
                    res.status(200).send({ message: 'Password reset successful' });
                })
            })
        }
    }
    catch (err) {
        console.log(err)
        return res.status(400).send({ message: 'Failed to reset password' });
    }
}

exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params
        const updatedUser = {}

        let { username, email, password, confirm, career, image } = req.body

        let username_lower = username ? username.toLowerCase() : ''
        email = email ? email.toLowerCase() : null

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({ message: 'User not found' })
        }

        if (career && career !== user.career) {
            updatedUser['career'] = career
        }

        if (email && email !== user.email) {
            const user = await User.findOne({ email })
            if (user) {
                return res.status(401).send({ message: 'Email is already taken' })
            } else {
                updatedUser['email'] = email
            }
        }

        if (username && username_lower !== user.username_lower) {
            const user = await User.findOne({ $or: [{ username_lower }, { username }] })
            if (user) {
                return res.status(401).send({ message: 'Username is already taken' })
            } else {
                updatedUser['username'] = username
                updatedUser['username_lower'] = username_lower
            }
        }

        if (password) {
            if (password !== confirm) {
                return res.status(400).send({ message: 'Password and confirmation must match' })
            }

            const compare = await bcrypt.compare(password, user.password)
            if (!compare) {
                const salt = await bcrypt.genSalt(saltRounds);
                const hash = await bcrypt.hash(password, salt);
                updatedUser['password'] = hash
            }
        }

        if (image) {
            updatedUser['image'] = image
        }

        console.log(updatedUser)

        if (Object.keys(updatedUser).length === 0) {
            return res.status(200)
        }

        // const updatedUser = { career, username, email, password, username_lower }

        User.findByIdAndUpdate(userId, updatedUser, { new: true })
            .then(user => {
                // if (updatedUser.career) {
                //     //Add user to new career members list
                //     //Remove them from members of old career members lists
                // }
                return res.status(200).send({ data: user, message: "Profile was updated successfully." });
            })
    } catch (err) {
        console.log(err)
        return res.status(400).send({ message: 'Failed to update profile' });
    }
}

exports.logout = (req, res, err) => {
    try {
        req.session.destroy();
        res.status(200).send({ message: 'Successfully logged out' })
    } catch (err) {
        res.status(400).send({ message: err.message })
    }
}