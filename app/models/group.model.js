const mongoose = require('mongoose');
const Post = require('./post.model');

// const opts = { toJSON: {virtuals:true}};
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
})

const MemberSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

// ImageSchema.virtual('thumbnail').get(function(){
//     return this.url.replace("/upload", "/upload/w_200")
// })

const GroupSchema = new Schema({
    image: ImageSchema,
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }],
    members: [MemberSchema],
    guidelines: [{
        type: String
}]
},
    { timestamps: true }
    // ,opts
)

GroupSchema.pre('deleteOne', async function (next) {
    try {
        console.log('hello!')
        // Find all posts associated with this group
        const posts = await Post.find({ _id: { $in: this.posts } })
        const comments = await Comment.find({ _id: { $in: this.comments } });
        // Delete all posts
        for (let post of posts) {
            await post.deleteOne()
        }
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


module.exports = mongoose.model('Group', GroupSchema)
