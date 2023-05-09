const db = require('../models/index.js')
const Message = db.messages
const User = db.users

exports.create = async (req, res) => {
    try {
        const { senderId, recipientId, body } = req.body
        const sender = await User.findById(senderId)
        const recipient = await User.findById(recipientId)

        const message = new Message({ sender, recipient, body })
        const notification = { type: 'Message', body: `${sender.username} sent you a message.`, from: sender }
        sender.messages.unshift(message)
        recipient.messages.unshift(message)
        recipient.notifications.unshift(notification)
        // recipient.countUnread()

        await message.save()
        await sender.save()
        await recipient.save()
        await sender.findById(id)
            .populate('messages')
            .then(data => {
                res.status(200).send(data)
            })
    } catch (e) {
        res.status(400).send({ message: 'Failed to reset password', messageStatus: 'error' })
    }
}

exports.conversations = async (req, res) => {
    try {
        const { userId } = req.params
        User.aggregate([
            { $match: { _id: userId } },
            { $unwind: '$messages' },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ['$messages.sender', userId] },
                            then: '$messages.recipient',
                            else: '$messages.sender'
                        }
                    },
                    latestMessage: {
                        $max: {
                          $cond: {
                            if: { $eq: ['$messages.sender', userId] },
                            then: '$messages.createdAt',
                            else: new Date(0)
                          }
                        }
                      },
                    message: {
                        $last: '$messages'
                    }
                }
            },
            { $sort: { latestMessage: -1 } },
            { $project: { contactId: '$_id', message: 1, _id: 0 } }          
        ]).exec((err, result) => {
            res.status(200).send(result)
        })
    } catch (e) {
        res.status(400).send({ message: "Could not get your messages", messageStatus: 'error' })
    }
}

exports.findSome = async (req, res) => {
    try {
        const { userId, contactId } = req.params
        const messages = await User.aggregate([
            { $match: { _id: userId } },
            { $unwind: '$messages' },
            { $match: { $or: [{ 'messages.sender': contactId }, { 'messages.recipient': contactId }] } }
        ])
        // const messages = await Message.updateMany({ $and: [{ sender: contactId }, { recipient: userId }] }, { read: true }, { new: true })
        res.status(200).send({ messages })
    } catch (e) {
        return res.status(400).send({ message: 'Failed to retreive messages', messageStatus: 'error' });
    }
}

exports.update = async (req, res) => {
    try {
        const { messageId } = req.body
        const message = await Message.findByIdAndUpdate({ id: messageId }, { $set: { liked: !message.liked } }, { new: true })
        res.status(200)
    } catch (e) {
        return res.status(400).send({ message: 'Failed to retreive messages', messageStatus: 'error' });
    }
}

exports.deleteAll = async (req, res) => {
    const { userId, contactId } = req.params
    await Message.deleteMany({ $or: [{ $and: [{ sender: userId }, { recipient: contactId }] }, { $and: [{ sender: contactId }, { recipient: userId }] }] })
        .then(data => {
            console.log(data)
            res.status(200).send({ message: 'Messages deleted', messageStatus: 'success' })
        })
}