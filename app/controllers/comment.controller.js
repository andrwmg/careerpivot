const db = require('../models/index.js')
const Comment = db.comments
const Post = db.posts
const User = db.users

const cascadeCommentCount = async (comment, increment) => {
  const next = await Comment.findByIdAndUpdate(comment._id, {$inc: {replyCount: increment}})
  .populate('parentComment')

  console.log(next.parentComment)

  if (next.parentComment) {
    cascadeCommentCount(next.parentComment)
  }
}

exports.create = async (req, res) => {
  try {
    const { postId } = req.params
    const userId = req.session.user._id
    const post = await Post.findById(postId)
      .populate('author')
    const comment = new Comment(req.body)
    comment.author = userId
    post.comments.unshift(comment)
    post.commentCount++
    await comment.save()
    await post.save()

    User.findByIdAndUpdate({ _id: userId }, { $addToSet: { comments: comment._id } })
      .then(data => {
        console.log(data)
      })

    if (userId !== post.author._id) {
      const user = await User.findById(post.author._id)
      const notification = { type: 'Comment', body: `${req.session.username} left a comment on your post`, from: userId }
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
        }})
    const comment = await Comment.findById(commentId)
      .populate('author')

    console.log(post.comments[0].replies)

    const reply = new Comment({ body, parentComment: commentId, parentPost: postId, author: userId })
    // post.author.notifications.unshift(notification)
    // reply.parentComment = commentId
    // reply.parentPost = postId
    // reply.author = userId

    comment.replies.unshift(reply._id)
    comment.replyCount++

    post.commentCount++

    // const cascadeCommentCount = async (comment) => {
    //   const next = await Comment.findByIdAndUpdate(comment._id, {$inc: {replyCount: 1}})
    //   .populate('parentComment')

    //   console.log(next.parentComment)

    //   if (next.parentComment) {
    //     cascadeCommentCount(next.parentComment)
    //   }
    // }
    cascadeCommentCount(comment, 1)

      // let updatedComment = comment
      // console.log('Initial', updatedComment, updatedComment.toString())

      // do {
      //   const parentCommentId = updatedComment.parentComment.toString()
      //   console.log('Before updating and moving to next comment', parentCommentId)
      //     const next = await Comment.updateOne({ _id: parentCommentId }, { $inc: { replyCount: 1 } })
      //     updatedComment = next.parentComment
      //     console.log('New comment with parent', updatedComment)
      // }
      // while (updatedComment.parentComment)


    // const parentCommentId = comment.parentComment
    // if (parentCommentId) {
    //   await Comment.updateOne({_id: parentCommentId}, { $inc: {replyCount: 1}})
    // }

    User.findByIdAndUpdate({ _id: userId }, { $addToSet: { comments: reply._id } })
      .then(data => {
        console.log(data)
      })

    await reply.save()
    await comment.save()
    await post.save()
    res.status(200).send({data: reply, message: 'Successfully replied'})
    // await Comment.findById(commentId)
    //   .populate({
    //     path: 'replies',
    //     populate: {
    //       path: 'author',
    //     }
    //   })
    //   .then((data) => {
    //     res.send(data.replies)
    //   })
  } catch (e) {
    res.status(400).send({ message: "Error replying to comment" })
  }
}

exports.findComments = async (req, res) => {
  try {
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