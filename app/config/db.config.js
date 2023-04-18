module.exports = {
    url: process.env.LOCAL ? 'mongodb://localhost:27017/careerpivot' : process.env.DB_URL
  };

  console.log(module.exports.url)