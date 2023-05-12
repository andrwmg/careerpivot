const express = require('express')
const session = require('express-session')
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')
const methodOverride = require('method-override')
const MongoStore = require("connect-mongo")
const cookieParser = require('cookie-parser');
require('dotenv').config() 

const app = express()

// app.use((req, res, next) => {
//     if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
//         return res.redirect('https://' + req.get('host') + req.url);
//       }
//       next();
//   });

const db = require("./app/models/index.js");

db.mongoose
    .connect(db.url, {
        useNewUrlParser: true,
    })
    .then(() => {
        console.log("Connected to the database!");
    })
    .catch(err => {
        console.log("Cannot connect to the database!", err);
        process.exit();
    });

const whitelist = ["https://www.careerpivot.io", "https://careerpivot.io", "http://localhost:7070", "http://localhost:7071"
]
const corsOptions = {
    origin:
        // "http://localhost:8081",
        function (origin, callback) {
            if (!origin || whitelist.indexOf(origin) !== -1) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
    credentials: true
}

app.use(bodyParser.urlencoded({extended: true}));
app.use(cors(corsOptions))
app.use(express.json())

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'))

app.use(express.static(path.join(__dirname, 'build')));

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/careerpivot';

const secret = process.env.SECRET

const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60,
  crypto: {
      secret
  }
});

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure:true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(cookieParser())
app.use(session(sessionConfig))

app.options('*', cors())

const userRoutes = require("./app/routes/user.routes");
const postRoutes = require("./app/routes/post.routes");
const commentRoutes = require("./app/routes/comment.routes");
const messageRoutes = require("./app/routes/message.routes");
const communityRoutes = require("./app/routes/community.routes");

app.use('/data/users', userRoutes)
app.use('/data/posts', postRoutes)
app.use('/data/posts', commentRoutes)
app.use('/data/messages', messageRoutes)
app.use('/data/communities', communityRoutes)

app.get('/api', (req,res) => {
    res.json({
      message: 'This is the api endpoint'
    })
  })

  app.get('/*', cors(corsOptions), (req,res,next) => {
    res.sendFile(path.join(__dirname, 'build','index.html'))
  })
  
  // set port, listen for requests
  const PORT = process.env.PORT || 7070;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });