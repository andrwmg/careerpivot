const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    body: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    replies: [{
        type: Schema.Types.ObjectId,
        ref: "Comment"
    }],
    likes: [{
        userId: String,
        date: Date
    }],
    dislikes: [{
        userId: String,
        date: Date
    }],
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    replyCount: {
        type: Number,
        default: 0
    },
    ranking: Number,
},{timestamps: true} 
)

CommentSchema.pre('deleteOne', async function(next) {
    try {
      // Find all comments associated with this comment
      const replies = await Comment.find({ _id: { $in: this.replies } });
  
      // Delete all comments
      for (let reply of replies) {
          await reply.deleteOne()
      }
    //   await Comment.deleteMany({ _id: { $in: this.replies } });
        console.log("Comment deleted")
      // Call the next middleware
      next();
    } catch (error) {
      next(error);
    }
  });

CommentSchema.methods.generateRanking = function() {
    try {
        this.ranking = this.likes.length - this.dislikes.length
    } catch (error) {
        next(error);
    }
}
module.exports = mongoose.model('Comment', CommentSchema)