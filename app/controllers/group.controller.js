const db = require('../models/index.js')
const Post = db.posts
const User = db.users
const Group = db.groups
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
        const { title, description, image } = req.body
        const userId = req.session.user._id

        const newGroup = new Post(
            {
                title,
                description,
                author: userId,
                images: image,
                description,
                members: [{ user: userId }]
            }
        );
        // Save Post in the database
        newGroup
            .save()
            .then(data => {
                res.status(200).send({ data, message: 'Group created successfully' });
            })
    } catch (e) {
        res.status(500).send({
            message:
                err.message || "Some error occurred while creating the group",
        });
    }
};

exports.findAll = (req, res) => {
    try {
        Group.find()
            .sort({ title: 1 })
            .then(data => {
                res.status(200).send(data.map(d => { return { title: d.title, _id: d._id } }))
            })
    } catch (e) {
        res.status(500).send({
            message:
                err.message || "Some error occurred while retrieving groups"
        });
    }
};

exports.findMyGroups = (req, res) => {
    try {

        const userId = req.session.user._id

        Group.find({ members: userId })
            .populate('author')
            .populate('image')
            .then(data => {
                res.status(200).send(data)
            })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: "Could not find your groups" })
    }
}

exports.findSome = (req, res) => {
    try {
        const { author, user, sort, order } = req.query
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
        if (user) {
            filter.members = user
        }

        Group.find(filter).sort(sortOrder)
            .populate('author')
            .populate('image')
            .then(data => {
                res.status(200).send(data)
            })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: "Could not find those groups" })
    }
}

exports.join = async (req, res) => {
    try {
        const { groupId } = req.params
        const userId = req.session.user._id

        const user = await User.findById(userId)
        Group.findOne({ _id: groupId })
            .then(data => {
                console.log('This is the group: ', data)
                const userIds = data.members.map(member => member.user.toString())
                const index = userIds.indexOf(userId)
                if (index === -1) {
                    data.members.push({ user: userId })
                    user.groups.push(data._id)
                    user.save()
                    data.save()
                    return res.status(200).send({ data, message: `Joined ${data.title} group` })
                } else {
                    data.members.splice(index, 1)
                    const filter = user.groups.filter(group => group._id.toString() !== data._id.toString())
                    user.groups = filter
                    user.save()
                    data.save()
                    return res.status(200).send({ data, message: `Left ${data.title} group` })
                }
            })
    } catch (e) {
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
        const groups = await Group.find()
            .populate({
                path: 'posts',
                populate: {
                    path: 'likes',
                    populate: {
                        path: 'user'
                    }
                }
            })
        for (let group of groups) {
            let totalLikeCount = 0
            for (let post of group.posts) {
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
            group['totalLikeCount'] = totalLikeCount
        }
        const sortedGroups = groups.sort((group1, group2) => {
            if (group1.likeCount !== group2.likeCount) {
                return group2.totalLikeCount - group1.totalLikeCount
            } else {
                return group1.title.localeCompare(group2.title)
            }
        });
        res.status(200).send({ data: sortedGroup, career, message: 'Got the popular groups!' })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: 'Could not get popular groups' })
    }
}

exports.trending = async (req, res) => {
    try {

        const lastWeek = new Date(); // Create a new Date object for 7 days ago
        lastWeek.setDate(lastWeek.getDate() - 7);
        const groups = await Group.find()
            .populate({
                path: 'posts',
                populate: {
                    path: 'likes',
                    populate: {
                      path: 'user'
                    }
                  }
            })

        console.log('Groups before filtering:')

        const filteredGroups = groups.map(group => {
            group['likesFromPastWeek'] = 0
            for (let post of group.posts) {
                const likesFromPastWeek = post.likes.filter(like => {
                    const likeDate = new Date(like.createdAt)
                    return likeDate > lastWeek
                })
                group['likesFromPastWeek'] += likesFromPastWeek.length
            }
            // const newPosts = group.posts.map(post => {
            //     const likesFromPastWeek = post.likes.filter(like => {
            //         const likeDate = new Date(like.createdAt)
            //         return likeDate > lastWeek
            //     })
            //     post['likesFromPastWeek'] = likesFromPastWeek
            //     return post
            // })
            // for (let post in newPosts) {
            //     group['likesFromPastWeek'] += post.likesFromPastWeek.length
            // }
            return group
        })

        console.log('Groups after filtering')

        const sortedGroups = filteredGroups.sort((group1, group2) => {
            return group2.likesFromPastWeek - group1.likesFromPastWeek;
        }).filter((item, index)=> {
            if (index < 10) {
                return true
            }
        })

        console.log(sortedGroups)

        res.status(200).send({ data: sortedGroups, message: 'Got trending groups!' })
    } catch (e) {
        res.status(500).send({ message: 'Error loading trending groups' })
    }
}

exports.latest = async (req, res) => {
    try {
        const groups = await Group.find()
            .populate('image')
            .populate({
                path: 'posts',
                    populate: {
                        path: 'likes',
                        populate: {
                          path: 'user'
                        }
                      },
                options: {
                    sort: 'createdAt'
                }
            })

        // const sortedGroups = groups.sort((group1, group2) => {
        //     return group2.posts[0].createdAt - group1.posts[0].createdAt;
        // });


        res.status(200).send({ data: groups, message: 'Got latest posts!' })
    } catch (e) {
        res.status(500).send({ message: 'Error loading latest posts' })
    }
}

exports.findOne = (req, res) => {
    try {
        const { groupId } = req.params;
        Group.findById(groupId)
            .populate({
                path: 'posts',
                populate: {
                    path: 'likes',
                    populate: {
                        path: 'user'
                    }
                },
                options: {
                    limit: 10
                }
            })
            .populate('image')
            .then(data => {
                if (!data) {
                    return res.status(404).send({ message: "Could not find group" });
                }
                    res.send(data);
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

        const { postId } = req.params;
        const userId = req.session.user._id

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

        const { postId } = req.params;
        const userId = req.session.user._id

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

            const notification = { type: 'Dislike', body: `${req.session.user.username} disliked your post.`, from: userId }

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
        Group.deleteMany({})
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
    const { careers } = req.body
    const objs = careers.map(career => ({
        title: career,
        author: req.session.user._id
    }))
    Group.insertMany(objs)
        .then(data => {
            res.status(200).send({ data, message: "Posted em!" })
        })
}