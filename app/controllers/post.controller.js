const db = require('../models/index.js')
const Post = db.posts
const User = db.users
const Community = db.communities

// const mbxgeocoding = require('@mapbox/mapbox-sdk/services/geocoding')
// const mapboxToken = process.env.MAPBOX_TOKEN
// const geocoder = mbxgeocoding({ accessToken: mapboxToken })
// const { cloudinary } = require('../cloudinary')

const sortByLikeDislikeDifference = (a, b) => {
  const aDiff = a.likes.length - a.dislikes.length;
  const bDiff = b.likes.length - b.dislikes.length;

  if (aDiff < bDiff) {
    return -1;
  } else if (aDiff > bDiff) {
    return 1;
  } else {
    return 0;
  }
};

exports.create = (req, res) => {
  try {
    const { title, body, career, tags, author, images } = req.body
    const newPost = new Post(
      {
        title,
        body,
        career,
        tags,
        author: req.session.user._id,
        images: images,
        // comments: [],
        // likes: [],
        // dislikes: [],
      }
    );
    // Save Post in the database
    newPost.save()

    User.findByIdAndUpdate({ _id: req.session.user._id }, { $addToSet: { 'posts': newPost._id } })
      .then(data => {
        console.log(data)
      })
    Community.findByIdAndUpdate({ _id: community }, { $addToSet: { 'posts': newPost._id } })
      .then(data => {
        console.log(data)
      })
    res.status(200).send({ data: newPost, message: 'Post created successfully' });

  } catch (e) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating the Post.",
    });
  }
};

exports.findAll = (req, res) => {
  try {
    Post.find()
      .populate('author')
      .populate('images')
      .populate('community')
      .populate({
        path: 'likes',
        populate: {
          path: 'user'
        }
      })
      .then(data => {
        res.send(data)
      })
  } catch (e) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while retrieving posts"
    });
  }
};

exports.findSome = (req, res) => {

  const {career, sort, order, author, tags, community} = req.params
  const filter = {}
  const sortOrder = {}
  if (sort && order) {
    if (sort = 'top') {
      sortOrder[sortByLikeDislikeDifference] = order
    } else {
      sortOrder[sort] = order
    }
  } else {
    sortOrder['createdAt'] = -1
  }
  if (author) {
    filter.author = author
  }
  if (career) {
    filter.career = career
  }
  if (tags) {
    filter.tags = tags
  }
  if (community) {
    filter.community = community
  }
  Post.find(filter).sort(sortOrder)
    .populate('author')
    .populate('images')
    .populate({
      path: 'likes',
      populate: {
        path: 'user'
      }
    })
    .then(data => {
      res.send(data)
    })
}

exports.findOne = (req, res) => {
  try {
  const { postId } = req.params;
  Post.findById(postId)
    .populate('author')
    .populate('images')
    .populate('career')
    .populate({
      path: 'likes',
      populate: {
        path: 'user'
      }
    })
    .populate({
      path: 'views',
      populate: {
        path: 'user'
      }
    })
    .populate({
      path: 'comments',
      populate: {
        path: 'author'
      }
    })
    .then(data => {
      if (!data) {
        return res.status(404).send({ message: "Post not found" });
      }
      if (req.session.user) {
        data.views.push({ user: req.session.user._id })
        data.save()
        User.findById({ _id: req.session.user._id })
        .then(data => {
          data.views.unshift({post: postId})
          data.save()
        })
      }
      res.send(data);
    })
  } catch(e) {
      res.status(500).send({ message: "Error retreiving post" });
    };
};

exports.trending = async (req, res) => {
  try {
    const {career} = req.params
    let filter = {}
    if (career) {
      filter['career'] = career
    }
    const lastWeek = new Date(); // Create a new Date object for 7 days ago
    lastWeek.setDate(lastWeek.getDate() - 7);
    console.log(filter)
    const posts = await Post.find(filter)
      .populate('author')
      .populate('images')
      .populate({
        path: 'likes',
        populate: {
          path: 'user'
        }
      })

    const filteredPosts = posts.map(post => {
      const likesFromPastWeek = post.likes.filter(like => {
        const likeDate = new Date(like.createdAt)
        return likeDate > lastWeek
      })
      post['likesPastWeek'] = likesFromPastWeek
      return post
  })
    const sortedPosts = filteredPosts.sort((post1, post2) => {
      return post2.likesPastWeek.length - post1.likesPastWeek.length;
    });
    res.status(200).send({ data: sortedPosts, message: 'Got trending posts!' })
  } catch (e) {
    res.status(500).send({ message: 'Error loading trending posts' })
  }
}

exports.update = (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }

    const { id } = req.params;

    Post.findByIdAndUpdate(id, req.body)
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot update Post with id=${id}. Maybe post was not found!`
          });
        } else res.send({ message: "Post was updated successfully." });
      })
  } catch (e) {
    res.status(500).send({
      message: "Error updating post with id=" + id
    });
  }
}

// exports.like = async (req, res) => {
//   try {

//     const { postId, userId } = req.params;

//     const post = await Post.findByIdAndUpdate({
//       _id: postId, 'likes.userId': { $ne: userId }
//     },
//       {
//         $addToSet: { likes: { userId, date: new Date() } },
//         $pull: { dislikes: { userId } }
//       },
//       { new: true }).populate('author')

//     if (userId !== post.author._id) {

//       const user = await User.findById(post.author._id)

//       const notification = { type: 'Like', body: `${req.session.user.username} liked your post.`, from: req.session.user._id }

//       user.notifications.unshift(notification)

//       await user.save()
//     }

//     res.status(200)

//   } catch (e) {
//     console.log(e)
//     res.status(500).send({
//       message: "Error adding like to post"
//     });
//   }
// }

exports.like = async (req, res) => {
  try {

    const { postId } = req.params;
    const userId = req.session.user._id

    if (!userId) {
      return res.status(400).send({ message: 'Must be logged in to like post' })
    }

    const post = await Post.findById(postId)
      .populate({
        path: 'likes',
        populate: {
          path: 'user'
        }
      })
      .populate('author')
    const index = post.likes.map(like => like.user._id.toString()).indexOf(userId)
    if (index === -1) {
      post.likes.push({ user: userId })
      await post.save()
      if (userId !== post.author._id) {

        const postAuthor = await User.findById(post.author._id)

        const notification = { type: 'Like', body: `${req.session.user.username} liked your post.`, from: req.session.user._id }

        postAuthor.notifications.unshift(notification)

        await postAuthor.save()
      }
      // Make sure that the post isn't alreayd in there and if it is remove it
      await User.findByIdAndUpdate({ _id: userId }, { $addToSet: { likes: { post: post._id } } })
      return res.status(200).send({ message: 'Post liked!' })
    } else {
      post.likes.splice(index, 1)
      await post.save()
      return res.status(200).send({ message: 'Post unliked!' })
    }

  } catch (e) {
    console.log(e)
    res.status(500).send({
      message: "Error adding like to post"
    });
  }
}

exports.dislike = async (req, res) => {
  try {

    const { postId, userId } = req.params;

    const post = await Post.findByIdAndUpdate({
      _id: postId, 'dislikes.userId': { $ne: userId }
    },
      {
        $addToSet: { dislikes: { userId, date: new Date() } },
        $pull: { likes: { userId } }
      },
      { new: true }).populate('author')

    if (userId !== post.author._id) {

      const user = await User.findById(post.author._id)

      const notification = { type: 'Dislike', body: `${req.session.user.username} disliked your post.`, from: req.session.user._id }

      user.notifications.unshift(notification)

      await user.save()
    }

    res.status(200);
  } catch (e) {
    res.status(500).send({
      message: "Error adding dislike to post"
    });
  }
}

exports.delete = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
    if (!post) {
      res.status(404).send({
        message: `Cannot delete post with id=${postId}. Maybe post was not found!`
      })
    }
    post.deleteOne()
    res.status(200).send({
      message: "Post was deleted successfully!"
    })
  } catch (e) {
    console.log("Oahweghwoeg", e)
    res.status(500).send({
      message: "Could not delete post with id="
    });
  }
}

exports.deleteAll = (req, res) => {
  try {
    Post.deleteMany({})
      .then(() => {
        res.send({ message: 'All posts deleted' })
      })
  } catch (e) {
    res.status(500).send({
      message: "Could not delete posts"
    });
  }
}

exports.seed = (req, res) => {
  Post.insertMany(req.body)
}