// const Listing = require("./app/models/listing.model");
// const Comment = require("./app/models/comment.model");


module.exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        return res.send('You must be signed in')
    } else {
        return next()
    }
}
// module.exports.isAuthor = async (req, res, next) => {
//     const { id } = req.params
//     const { _id } = req.session.user;
//     const listing = await Listing.findById(id).populate('author')
//     if (_id.toString() === listing.author._id.toString()) {
//         return next()
//     } else {
//         return res.send({message: 'You need to be the author of the listing to modify it', messageStatus: 'error'})
//     }
// }

// module.exports.isCommentAuthor = async (req, res, next) => {
//     const { commentId } = req.params;
//     const comment = await Comment.findById(commentId);
//     if (!comment.author.equals(req.user._id)) {
//         req.flash('error', "You don't have permission to do that")
//         return res.redirect(`/listings/${id}`)
//     }
//     next()
// }