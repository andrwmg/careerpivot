const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
// const MessageSchema = require('../models/message.model')

const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
})

const NotificationSchema = new Schema({
    body: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enums: ['Message', 'Comment'],
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true })

const MessageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    liked: {
        type: Boolean,
        default: false
    },
}, { timestamps: true })

const UserSchema = new Schema({
    image: ImageSchema,
    username: {
        type: String,
        required: true,
        unique: true
    },
    username_lower: {
        type: String,
        lowercase: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    password: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    verificationToken: String,
    messages: [MessageSchema],
    unreadMessages: Number,
    notifications: [NotificationSchema],
    unreadNotifications: Number,
    career: {
        type: String,
        default: 'Product Design'
    },
    groups: [{
        type: Schema.Types.ObjectId,
        ref: 'Group'
    }],
    likes: [{
        post: {
            type: Schema.Types.ObjectId,
            refPath: 'Post'
        },
        comment: {
            type: Schema.Types.ObjectId,
            refPath: 'Comment',
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    views: [{
        post: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }],
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }],
}, { timestamps: true }
)

UserSchema.methods.generateLower = function () {
    try {
        this.username_lower = this.username.toLowerCase()
    } catch (error) {
        next(error);
    }
}

UserSchema.methods.countUnread = function () {
    console.log('messages', this.messages.length, 'notifications', this.notifications.length)

    try {
        this.unreadMessages = this.messages.length
        this.unreadNotifications = this.notifications.length
    } catch (error) {
        next(error);
    }
}

UserSchema.methods.updateContacts = async function () {
    try {
        const uniqueContacts = await this.model('User').aggregate([
            { $match: { _id: this._id } },
            { $unwind: '$messages' },
            { $group: { _id: { $concat: ["$messages.sender", "-", "$messages.recipient"] } } },
            { $project: { user: { $split: ["$_id", "-"] } } },
            { $unwind: "$user" },
            { $group: { _id: "$user" } }
        ])
        this.contacts = uniqueContacts.map(u => u._id)
    } catch (e) {
        next(e);
    }
}

UserSchema.methods.hashPassword = async function () {
    try {
        const salt = await bcrypt.genSalt(Number(process.env.SALT_COUNT) || 10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
    } catch (error) {
        next(error);
    }
}

UserSchema.methods.generateVerificationToken = function () {
    this.verificationToken = Math.random().toString(36).slice(-10);
    return this.verificationToken;
};

UserSchema.methods.generateResetToken = function () {
    this.resetPasswordToken = Math.random().toString(36).slice(-10);
    this.resetPasswordExpires = Date.now() + 3600000;
    return this.resetPasswordToken;
};

module.exports = mongoose.model('User', UserSchema)