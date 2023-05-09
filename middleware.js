const Post = require("./app/models/post.model");
const Comment = require("./app/models/comment.model");


module.exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        return res.send('You must be signed in')
    } else {
        return next()
    }
}
module.exports.isPostAuthor = async (req, res, next) => {
    const { postId } = req.params
    const userId = req.session.user._id
    console.log(postId)
    const p = await Post.find({_id: '64547609b1f69272a34962bd'})
    console.log(p)
    const post = await Post.findById('64547609b1f69272a34962bd').populate('author')
    console.log(post)
    if (userId === post.author._id) {
        return next()
    } else {
        return res.send({message: 'You need to be the author of this post to modify it', messageStatus: 'error'})
    }
}

module.exports.isCommentAuthor = async (req, res, next) => {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment.author.equals(req.user._id)) {
        req.flash('error', "You don't have permission to do that")
        return res.redirect(`/listings/${id}`)
    }
    next()
}