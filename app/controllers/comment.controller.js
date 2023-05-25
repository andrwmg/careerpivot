const db = require('../models/index.js')
const Comment = db.comments
const Post = db.posts
const User = db.users

const cascadeCommentCount = async (comment, increment) => {
  const next = await Comment.findByIdAndUpdate(comment._id, { $inc: { replyCount: increment } })
    .populate('parentComment')

  console.log(next.parentComment)

  if (next.parentComment) {
    cascadeCommentCount(next.parentComment)
  }
}

exports.create = async (req, res) => {
  try {
    const { postId } = req.params
    const {body} = req.body
    const userId = req.session.user._id
    const post = await Post.findById(postId)
      .populate('author')
    const comment = new Comment({body, parentPost: postId, author: userId})
    post.comments.unshift(comment._id)
    post.commentCount++
    await comment.save()
    await post.save()

    const user = await User.findByIdAndUpdate({ _id: userId }, { $addToSet: { comments: comment._id } })
    .populate('image')
      // .then(data => {
      //   console.log(data)
      // })
      // const io = req.app.get('socketio')

    if (userId !== post.author._id) {
      // console.log(io)
      const user = await User.findById(post.author._id)
      const notification = { type: 'Comment', body: `${req.session.user.username} left a comment on your post`, from: userId }
      user.notifications.unshift(notification)
      user.save()
      // io.emit('new notification', {
      //   originalAuthor: post.author._id,
      //   notificationId: 1,
      //   from: userId,
      //   postId,
      //   commentId: comment._id,
      //   body: `${req.session.user.username} ${post.comments.length > 1 && `and ${post.comments.length - 1} others`} left a comment on your post`
      // })
    }

    await Comment.findById(comment._id)
    .populate({
      path: 'author',
      populate: {
        path: 'image'
      }
    })
    .then(data => {
      // io.emit('new comment', data)
      res.status(200).send({data, message: 'Comment added'})
    })

  } catch (e) {
    res.status(400)
  }
}

exports.reply = async (req, res) => {
  try {
    const { postId, commentId } = req.params
    const userId = req.session.user._id
    const { body } = req.body

    const post = await Post.findById(postId)
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'replies'
        }
      })
    const comment = await Comment.findById(commentId)
      .populate('author')

    const reply = new Comment({ body, parentComment: commentId, parentPost: postId, author: userId })

    comment.replies.unshift(reply._id)
    comment.replyCount++

    post.commentCount++

    cascadeCommentCount(comment, 1)

    User.findByIdAndUpdate({ _id: userId }, { $addToSet: { comments: reply._id } })

    await reply.save()
    await comment.save()
    await post.save()

    if (userId !== comment.author._id) {
      // const io = req.app.get('socketio')
      const user = await User.findById(comment.author._id)
      const notification = { type: 'Reply', body: `${req.session.user.username} replied to your comment`, from: userId }
      user.notifications.unshift(notification)
      user.save()
      // io.emit('new notification', {
      //   originalAuthor: comment.author._id,
      //   notificationId: 1,
      //   from: userId,
      //   postId,
      //   commentId: comment._id,
      //   body: `${req.session.user.username} ${comment.replies.length > 1 ? `and ${comment.replies.length - 1} others` : ''} replied to your comment`
      // })
    }

    await Comment.findById(reply._id)
    .populate({
      path: 'author',
      populate: {
        path: 'image'
      }
    })
    .then(data => {
      console.log(data.author.image)
      res.status(200).send({data, message: 'Reply added'})
    })
    } catch (e) {
    res.status(400).send({ message: "Error replying to comment" })
  }
}

exports.findComments = async (req, res) => {
  try {
    const { postId } = req.params
    const {skip, limit} = req.query
    const post = await Post.findById(postId)
    .populate({
      path: 'comments',
      options: {
        sort: {'createdAt': -1},
        skip: parseInt(skip),
        limit: parseInt(limit)
      },
      populate: {
        path: 'author',
      }
    })
    const comments = post.comments
    res.status(200).send( comments )
  } catch (e) {
    console.log(e)
    res.status(500).send({ message: 'Error loading comments' })
  }
}

exports.findReplies = async (req, res) => {
  try {
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
  } catch (e) {
    console.log(e)
    res.status(500).send({ message: 'Error loading replies' })
  }
}

exports.like = async (req, res) => {
  try {

    const { commentId } = req.params;
    const userId = req.session.user._id

    if (!userId) {
      return res.status(400).send({ message: 'Must be logged in to like post' })
    }

    const comment = await Comment.findById(commentId)
      .populate({
        path: 'likes',
        populate: {
          path: 'user'
        }
      })
      .populate('author')
    const index = comment.likes.map(like => like.user._id.toString()).indexOf(userId)
    if (index === -1) {
      comment.likes.push({ user: userId })
      await comment.save()
      if (userId !== comment.author._id) {

        const commentAuthor = await User.findById(comment.author._id)

        const notification = { type: 'Like', body: `${req.session.user.username} liked your comment.`, from: req.session.user._id }

        commentAuthor.notifications.unshift(notification)

        await commentAuthor.save()
      }
      // Make sure that the post isn't alreayd in there and if it is remove it
      await User.findByIdAndUpdate({ _id: userId }, { $addToSet: { likes: { comment: comment._id } } })

      return res.status(200).send({ message: 'Comment liked!' })
    } else {

      comment.likes.splice(index, 1)
      await comment.save()

      await User.findByIdAndUpdate({ _id: userId }, { $pull: { likes: { comment: comment._id } } })

      return res.status(200).send({ message: 'Comment unliked!' })
    }

  } catch (e) {
    console.log(e)
    res.status(500).send({
      message: "Error adding like to comment"
    });
  }
}

exports.update = (req, res) => {
  try {
    const { commentId } = req.params
    console.log(req.body)
    const { body } = req.body
    Comment.findByIdAndUpdate(commentId, { body }, { new: true })
      .then(data => {
        res.status(200).send({ data, message: 'Comment successfully updated' })
      })
  } catch (e) {
    console.log(e)
    res.status(400).send('Error updating comment')
  }
}

exports.delete = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findByIdAndDelete(commentId);

    cascadeCommentCount(comment, -1)

    const post = await Post.findById(comment.parentPost)
      .populate({
        path: 'comments',
        populate: {
          path: 'author'
        }
      })
      .populate('author')
    post.comments = post.comments.filter(comment => comment._id !== commentId)
    post.commentCount--

    await Post.save()

    res.status(200).send({ data: post, message: 'Comment deleted' })
  } catch (e) {
    res.status(500).send({ message: 'Could not delete comment' })
  }
}

exports.deleteAll = (req, res) => {

}