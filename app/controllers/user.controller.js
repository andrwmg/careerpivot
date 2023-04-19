const express = require('express');
const db = require('../models/index.js')
const User = db.users
const nodemailer = require('nodemailer')
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt')
const mailjet = require('node-mailjet').connect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY)

// const request = mailjet
// .post("send", {'version': 'v3.1'})


// const mailjet = new Mailjet({
//     apiKey: process.env.MAILJET_API_KEY,
//     apiSecret: process.env.MAILJET_SECRET_KEY
//   });

async function sendVerificationEmail(userEmail, verificationToken, type) {

    const baseURL = process.env.LOCAL ? `http://localhost:7071` : 'https://www.careerpivot.io'

     const request = mailjet
        .post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: process.env.MAILJET_EMAIL,
                        Name: 'Andrew'
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
    const { email, username, password, image } = req.body

    try {
        const existingUser = await User.find({ $or: [{ username }, { email }] })
        if (existingUser.length) {
            res.send({ message: 'Username or email are already taken', messageStatus: 'error' });
            return;
        } else {

            const user = new User({ email, username, image: image[0] })
            const token = user.generateVerificationToken();

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            user.password = hash;

            user.save()
            req.session.token = token
            sendVerificationEmail(email, token, 'verify')
            res.status(200).json({ message: 'Verification email sent', messageStatus: 'success' })
            // const transporter = nodemailer.createTransport({
            //     host: sgSMTP,
            //     port: 587,
            //     auth: {
            //         user: sgUser,
            //         password: sgPassword
            //     }
            // })

            // const mailOptions = {
            //     to: user.email,
            //     from: sgUser,
            //     subject: 'Tesla Mart Account Verification Token',
            //     text: `Please verify your new Tesla Mart account by clicking the link: \nhttp:\/\/localhost:7071\/verify\/${token}\n`
            // }

            // sgMail.send(mailOptions, (error, result) => {
            //     if (error) {
            //         res.status(500).json({ message: 'Failed to send verification email', messageStatus: 'error' })
            //     } else {
            //         res.status(200).json({ message: 'Verification email sent', messageStatus: 'success' })
            //     }
            // })
        }
    }
    catch (e) {
        if (e.message.includes('E11000')) {
            res.send({ message: 'Failed to register user', messageStatus: 'error' })
        } else {
            res.send({ message: e.message, messageStatus: 'error' });
        }
    }
}

exports.verify = async (req, res, err) => {
    const { token } = req.params
    console.log(token)

    if (!token) {
        res.send({ message: 'Invalid verification token', messageStatus: 'error' });
    } else {
        try {
            await User.findOneAndUpdate({ verificationToken: token }, { isVerified: true, verificationToken: null })
                .then(data => {
                    if (!data) {
                        res.send({ message: 'Invalid verification token', messageStatus: 'error' });
                    } else {
                        res.send({ message: 'Account verified', messageStatus: 'success' });
                    }
                })
        }
        catch (err) {
            console.log(err)
            res.send({ message: 'Failed to verify account', messageStatus: 'error' });
        }
    }
}

exports.resend = async (req, res, err) => {
    const { email, password } = req.body
    try {
        const user = await User.findOne({ email })
        if (!user) {
            return res.send({ message: 'Invalid email or password', messageStatus: 'error' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.send({ message: 'Invalid email or password', messageStatus: 'error' });
        }
        if (user.isVerified) {
            return res.send({ message: 'Account is already verified', messageStatus: 'error' });
        }

        const token = user.generateVerificationToken()

        // const transporter = nodemailer.createTransport({
        //     host: 'smtp.sendgrid.net',
        //     port: 587,
        //     auth: {
        //         user: sgUser,
        //         password: sgPassword
        //     }
        // })

        // const mailOptions = {
        //     to: user.email,
        //     from: sgUser,
        //     subject: 'Tesla Mart Account Verification Token',
        //     text: `Please verify your new Tesla Mart account by clicking the link: \nhttp:\/\/localhost:7071\/verify\/${token}\n`
        // }

        sendVerificationEmail(email, token, 'verify')
        res.status(200).json({ message: 'Verification email resent', messageStatus: 'success' })

    } catch (e) {
        if (e.message.includes('E11000')) {
            res.send({ message: 'Failed to register user', messageStatus: 'error' })
        } else {
            res.send({ message: e.message, messageStatus: 'error' });
        }
    }
}

exports.login = async (req, res, err) => {
    const { email, username, password } = req.body
    try {
        const user = await User.findOne({ $or: [{ username }, { email }] });
        if (!user) {
            return res.send({ message: 'Invalid username or password', messageStatus: 'error' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.send({ message: 'Invalid username or password', messageStatus: 'error' });
        }
        if (!user.isVerified) {
            return res.send({ message: 'Account not verified', messageStatus: 'error' });
        }
        req.session.user = user

        console.log(req, res)

        res.send({ token: req.session.cookie, user, message: 'Welcome back to CareerPivot!', messageStatus: 'success' })

    } catch (err) {
        res.send({ message: 'Login failed', messageStatus: 'error' });
    }
}


exports.getUser = async (req, res, err) => {
    const { id } = req.body
    if (req.session.user && req.session.user._id === id) {
        const user = await User.findById(req.session.user._id)
            .populate({
                path: 'inbox',
                populate: [
                    { path: 'to' }, { path: 'from' }
                ]
            })
            .populate({
                path: 'outbox',
                populate: [
                    { path: 'to' }, { path: 'from' }
                ]
            })
        res.send(user)
    }
}

exports.forgot = async (req, res, err) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email })
        if (!user) {

            res.send({ message: 'Could not find account with that username', messageStatus: 'error' })

        } else {

            const token = user.generateResetToken()

            user.save()

            // const transporter = nodemailer.createTransport({
            //     host: 'smtp.sendgrid.net',
            //     port: 587,
            //     auth: {
            //         user: sgUser,
            //         password: sgPassword
            //     }
            // })

            // const mailOptions = {
            //     to: user.email,
            //     from: sgUser,
            //     subject: 'Tesla Mart Reset Password Token',
            //     text: `Please reset your Tesla Mart account password by clicking the link: \nhttp:\/\/localhost:7071\/reset\/${token}\n`
            // }

            // sgMail.send(mailOptions, (error, result) => {
            //     if (error) {
            //         res.status(500).json({ message: 'Failed to send reset password email', messageStatus: 'error' })
            //     } else {
            //         res.status(200).json({ message: 'Reset password email has been sent', messageStatus: 'success' })
            //     }
            // })

            sendVerificationEmail(email, token, 'reset')
            res.status(200).json({ message: 'Reset password email has been sent', messageStatus: 'success' })
        }
    } catch (err) {
        console.log(err)
        res.send({ message: 'Failed to send reset password email', messageStatus: 'error' });
    }
}

exports.setToken = async (req, res) => {
    const { token } = req.params

    try {
        const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.send({ message: 'Password reset token is invalid or has expired', messageStatus: 'error' });
        } else {
            req.session.token = token
            res.send({ message: 'Token accepted. Reset password now', messageStatus: 'success' })
        }
    }
    catch (err) {
        console.log(err)
        return res.send({ message: 'Failed to reset password', messageStatus: 'error' });
    }
}

exports.reset = async (req, res) => {
    const { token } = req.session
    const { password, confirm } = req.body

    try {
        if (password !== confirm) {
            return res.send({ message: 'Passwords do not match. Try again', messageStatus: 'error' });

        } else {
            const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
            if (!user) {
                return res.send({ message: 'Password reset token is invalid or has expired', messageStatus: 'error' });
            } else {
                const saltRounds = 10;

                bcrypt.genSalt(saltRounds, (err, salt) => {
                    if (err) {
                        return next(err);
                    } else { }
                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) {
                            console.log(err)
                            return res.send({ message: 'Password reset token is invalid or has expired', messageStatus: 'error' });
                        }
                        user.password = hash;
                        user.resetPasswordToken = null;
                        user.resetPasswordExpires = null;
                        req.session.token = null
                        user.save()
                        return res.send({ message: 'Password reset successful', messageStatus: 'success' });

                    })
                })
            }
        }
    }
    catch (err) {
        console.log(err)
        return res.send({ message: 'Failed to reset password', messageStatus: 'error' });
    }
}


exports.updateUser = async (req, res) => {
    const { id } = req.params
    const { _id } = req.session.user
    if (id !== _id) {
        res.status(500).send({
            message: "Error updating Profile with id=" + id, messageStatus: 'error'
        })
    } else {
        const user = await User.findByIdAndUpdate(id, req.body, { returnOriginal: false, new: true })
        if (!user) {
            res.status(404).send({
                message: `Cannot update Profile with id=${id}. Maybe User was not found!`, messageStatus: 'error'
            });
        } else {
            res.send({ image: req.body.image, message: "Profile was updated successfully.", messageStatus: 'success' });
        }
    }
}

exports.sendMessage = async (req, res) => {
    const { fromId, toId } = req.params
    if (fromId === toId) {
        res.send({ message: 'This is your listing! Cannot message yourself', messageStatus: 'error' })
    } else {
        const { _id } = req.session.user

        if (fromId === _id) {
            const sender = await User.findById(fromId).populate('outbox')
            const recipient = await User.findById(toId).populate('inbox')
            sender.outbox.push(req.body)
            recipient.inbox.push(req.body)
            await sender.save()
            await recipient.save()
                .then(data => {
                    if (!data) {
                        res.status(404).send({
                            message: `Cannot send message to id=${toId}. Maybe User was not found!`, messageStatus: 'error'
                        });
                    } else res.send({ message: "Message was sent successfully.", messageStatus: 'success' });
                })
                .catch(err => {
                    res.status(500).send({
                        message: "Error sending message", messageStatus: 'error'
                    });
                });
        }
    }
}

exports.logout = (req, res, err) => {
    try {
        // if (!req.session) {
        //     res.send({ message: 'No user logged in', messageStatus: 'error' })
        // } else {
        req.session.destroy();
        res.send({ message: 'Successfully logged out', messageStatus: 'success' })
        // }
    } catch (err) {
        res.send({ message: err.message, messageStatus: 'error' })
    }
}