const mongoose = require('mongoose');
const Comment = require('./comment.model');

// const opts = { toJSON: {virtuals:true}};
const Schema = mongoose.Schema;

const ImageSchema = new Schema ({
    url: String,
    filename: String
})

// ImageSchema.virtual('thumbnail').get(function(){
//     return this.url.replace("/upload", "/upload/w_200")
// })

const PostSchema = new Schema ({
    images: [ImageSchema],
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    career: {
        type: String,
        required: true
    },
    tags: [{
            type: String,
    }],
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    comments: [{
       type: Schema.Types.ObjectId,
       ref: 'Comment'
    }],
    commentCount: {
        type: Number,
        default: 0
    },
    likes: [{
        userId: String,
        date: Date
    }],
     dislikes: [{
        userId: String,
        date: Date
    }],
    community: {
        type: Schema.Types.ObjectId,
        ref: 'Community'
    }
},    
{timestamps: true} 
// ,opts
)

PostSchema.pre('deleteOne', async function(next) {
    try {
        console.log('hello!')
      // Find all comments associated with this comment
      const comments = await Comment.find({ _id: { $in: this.comments } });
        console.log(comments)
      // Delete all comments
      for (let comment of comments) {
          await comment.deleteOne()
      }
    //   await Comment.deleteMany({ _id: { $in: this.comments } });
  
      // Call the next middleware
      console.log('Deleted Post')
      next();
    } catch (error) {
      next(error);
    }
  });

// PostSchema.post('findOneAndDelete', async function (doc) {
//     if (doc) {
//         await Comment.remove({
//             _id: {
//                 $in: doc.comments 
//             }
//         })
//     }
// })


module.exports = mongoose.model('Post', PostSchema)
