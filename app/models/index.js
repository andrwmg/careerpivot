const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
// mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose.set('strictQuery', true);
db.url = dbConfig.url;
db.users = require("./user.model.js");

module.exports = db;