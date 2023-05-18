const Post = require("./app/models/post.model");
const Comment = require("./app/models/comment.model");
const jwt = require('jsonwebtoken');

module.exports.verifyToken = (req, res, next) => {
  // Extract the token from the request headers
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify and decode the token using the secret key
    const decoded = jwt.verify(token, process.env.SECRET);
    console.log(decoded)
    req.user = decoded; // Attach the decoded user information to the request object

    const currentTimestamp = Date.now() / 1000;
    if (decoded.exp <= currentTimestamp) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    } 

    next(); // Move to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({ message: 'You must be signed in' });
  }
};

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
    if (!comment.author.equals(req.session.user._id)) {
        return res.send({message: 'You need to be the author of this comment to modify it'}) }
    next()
}