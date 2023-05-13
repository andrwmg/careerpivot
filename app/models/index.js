const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
// mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose.set('strictQuery', true);
db.url = dbConfig.url;
db.comments = require("./comment.model.js");
db.posts = require("./post.model.js");
db.users = require("./user.model.js");
db.messages = require('./message.model')
db.groups = require('./group.model')

module.exports = db;