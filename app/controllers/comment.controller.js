const db = require('../models/index.js')
const Comment = db.comments
const Post = db.posts
const User = db.users

exports.create = async (req, res) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId)
      .populate('author')
    const comment = new Comment(req.body)
    comment.author = req.session.user._id
    post.comments.unshift(comment)
    post.commentCount++
    await comment.save()
    await post.save()

    if (req.body.userId !== post.author._id) {

      const user = await User.findById(post.author._id)
      const notification = { type: 'Comment', body: `${req.session.username} left a comment on your post.`, from: req.session.user._id }
      user.notifications.unshift(notification)
      user.save()
    }

    await Post.findById(postId)
      .populate({
        path: 'comments',
        populate: {
          path: 'author'
        }
      })
      .then(data => {
        res.send(data)
      })
  } catch (e) {
    res.status(400)
  }
}

exports.reply = async (req, res) => {
  const { postId, commentId } = req.params
  const { body } = req.body

  const post = await Post.findById(postId)
    .populate('author')
  const comment = await Comment.findById(commentId)
    .populate('author')

  // const commenterNotification = { type: 'Reply', body: `${req.session.user._id} left replied to your comment.`, from: req.session.user._id }
  // const postNotification = { type: 'Comment', body: `${req.session.user._id} commented on your post.`, from: req.session.user._id }

  // comment.author.notifications.unshift(commenterNotification)
  // post.author.notifications.unshift(postNotification)

  const reply = new Comment({ body })
  post.commentCount++
  // post.author.notifications.unshift(notification)
  reply.parentComment = commentId
  reply.author = req.session.user._id

  comment.replies.unshift(reply)
  comment.replyCount++

  const parentComment = comment.parentComment
  if (parentComment) {

  }

  await reply.save()
  await comment.save()
  await post.save()
  await Comment.findById(commentId)
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
      }
    })
    .then((data) => {
      res.send(data.replies)
    })
}

exports.findComments = async (req, res) => {
  console.log("Yay")
  const { postId } = req.params
  const post = await Post.findById(postId)
    .populate({
      path: 'comments',
      populate: {
        path: 'author',
      }
    })
  const comments = post.comments
  res.status(200).send({ comments })
}

exports.findReplies = async (req, res) => {
  const { commentId } = req.params
  const comment = await Comment.findById(commentId)
    .populate({
      path: 'replies',
      populate: {
        path: 'author'
      }
    })
  const replies = comment.replies
  res.status(200).send({ replies })
}

exports.update = (req, res) => {

}

exports.delete = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const post = await Post.findById(id)
      .populate({
        path: 'comments',
        populate: {
          path: 'author'
        }
      })
      .populate('author')
    post.comments = post.comments.filter(comment => comment._id !== commentId)
    post.commentCount--
    await Comment.findByIdAndDelete(commentId);
    await Post.save()
    res.status(200).send({ post })
  } catch (e) {
    res.status(500).send({ message: 'Could not delete comment' })
  }
}

exports.deleteAll = (req, res) => {

}