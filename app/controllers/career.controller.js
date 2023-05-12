const db = require('../models/index.js')
const Community = db.communities
const Post = db.posts
const User = db.users
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
        const { title, tagline, career, author, images } = req.body
        const newCommunity = new Post(
            {
                title,
                tagline,
                body,
                career,
                tags,
                author,
                images: images,
                members: [{ user: req.session.user._id, joinedAt: Date.now() }]
                // comments: [],
                // likes: [],
                // dislikes: [],
            }
        );
        // Save Post in the database
        newCommunity
            .save()
            .then(data => {
                res.status(200).send({ data, message: 'Community created successfully' });
            })
    } catch (e) {
        res.status(500).send({
            message:
                err.message || "Some error occurred while creating the community",
        });
    }
};

exports.findAll = (req, res) => {
    try {
        Post.find()
            .populate('author')
            .populate('images')
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

exports.findMyCommunites = (req, res) => {
    try {

        const { id } = req.session.user._id

        Community.find({ users: id })
            .populate('author')
            .populate('image')
            .then(data => {
                res.send(data)
            })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: "Could not find your communites" })
    }
}

exports.findSome = (req, res) => {
    try {
        const { author, career, tags, community, sort, order, user } = req.query
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
        Community.find(filter).sort(sortOrder)
            .populate('author')
            .populate('images')
            .then(data => {
                res.send(data)
            })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: "Could not find those communites" })
    }
}

exports.join = async (req, res) => {
    try{
        const {communityId} = req.params
        const user = await User.findById(req.session.user._id)
        .populate('communities')
        Community.findOne({_id: communityId})
        .populate({
            path: 'members',
            populate: {
                path: 'user'
            }
        })
        .then(data => {
            console.log('This is the community: ', data)
            const index = data.members.map(member => member.user._id.toString()).indexOf(req.session.user._id)
            if (index === -1) {
                data.members.push({user: req.session.user._id})
                user.communities.push(data._id)
                user.save()
                data.save()
            return res.status(200).send({data, message: `Joined ${data.title}`})
            } else {
                data.members.splice(index, 1)
                const filter = user.communities.filter(community => community._id !== data._id)
                user.communities = filter
                user.save()
                data.save()
            return res.status(200).send({data, message: `Left ${data.title}`})
            }
                    })
    } catch (e){
        res.status(500).send({ message: "Error updating membership" })
    }
}

// exports.findPopular = async (req, res) => {
//     try {
//         const { career } = req.params
//         const communities = await Community.aggregate([
//             // Unwind the users array to create a separate document for each user

//             { $match: { $or: [ {"users.career": career }, {"members.career": career }]} },

//             { $unwind: '$members' },

//             { $unwind: '$users' },

//             // Match users with a specific career
//             { $match: { $or: [ {'members.career': career}, {'users.career': career}] } },

//             // Group by community ID and count the number of users
//             { $group: { _id: { name: "$name", id: "$_id" }, count: { $sum: 1 } } },

//             // Sort by usersCount in descending order
//             { $sort: { count: -1 } },

//             // Limit to the top 10 communities by usersCount
//             { $limit: 10 }
//         ])
//               console.log(communities);
//               res.status(200).send({ data: communities, career, message: 'Got the popular communities!' })
//     } catch (e) {
//         console.log(e)
//         res.status(500).send({ message: 'Could not get popular communities' })
//     }
// }

exports.findPopular = async (req, res) => {
    try {
        const { career } = req.params
        const communities = await Community.find()
            .populate({
                path: 'posts',
                populate: {
                    path: 'likes',
                    populate: {
                        path: 'user'
                    }
                }
            })
        for (let community of communities) {
            let totalLikeCount = 0
            for (let post of community.posts) {
                let filteredLikes = post.likes.filter(like => {
                    return like.user.career === career
                })
                //     console.log(like)
                //     User.findById(like.user)
                //         .then(data => {
                //             return data.career === career
                //         })
                // })
                totalLikeCount += filteredLikes.length
            }
            community['totalLikeCount'] = totalLikeCount
        }
        const sortedCommunities = communities.sort((comm1, comm2) => {
            if (comm1.likeCount !== comm2.likeCount) {
                return comm2.totalLikeCount - comm1.totalLikeCount
            } else {
                return comm1.title.localeCompare(comm2.title)
            }
        });
        res.status(200).send({ data: sortedCommunities, career, message: 'Got the popular communities!' })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: 'Could not get popular communities' })
    }
}


exports.findOne = (req, res) => {
    try {
        const { communityId } = req.params;
        Community.findById(communityId)
            .populate('author')
            .populate({
                path: 'posts',
                options: {
                    limit: 10
                }
            })
            .populate('image')
            .then(data => {
                if (!data) {
                    res.status(404).send({ message: "Could not find community" });
                } else {
                    for (let post of data.posts) {
                        const userLikes = post.likes.map(l => l.userId)
                        const userDislikes = post.dislikes.map(d => d.userId)
                        post.likes = userLikes
                        post.dislikes = userDislikes
                    }

                    res.send(data);
                }
            })
    } catch (e) {
        res.status(500).send({ message: 'Error finding community' })
    }
};

exports.update = (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send({
                message: "Data to update can not be empty!"
            });
        }

        const { id } = req.params;

        Community.findByIdAndUpdate(id, req.body)
            .then(data => {
                if (!data) {
                    res.status(404).send({
                        message: `Cannot not find community`
                    });
                } else res.send({ message: "Post was updated successfully." });
            })
    } catch (e) {
        res.status(500).send({
            message: "Error updating community"
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

        const { postId, userId } = req.params;

        if (!userId) {
            return res.status(400).send({ message: 'Must be logged in to like post' })
        }

        const post = await Post.findById(postId)
            .populate('likes')
            .populate('author')
        const index = post.likes.map(like => like.user._id).indexOf(userId)
        if (index === -1) {
            post.likes.push({ user: userId })
            await post.save()
            if (userId !== post.author._id) {

                const user = await User.findById(post.author._id)

                const notification = { type: 'Like', body: `${req.session.user.username} liked your post.`, from: req.session.user._id }

                user.notifications.unshift(notification)

                await user.save()
            }
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