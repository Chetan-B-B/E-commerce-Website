const path = require('path');
const fs = require('fs');
const express = require('express');
//const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDbStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const errorController = require('./controllers/error');
const morgan = require('morgan');

const User = require('./models/user');

const app = express();

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.tfz9s.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getMilliseconds().toString() + '_' + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const store = new MongoDbStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});
const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  {
    flags: 'a',
  }
);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        connectSrc: ["'self'", 'https://js.stripe.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
      },
    },
  })
);
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

//helps to parse incoming data
app.use(express.urlencoded({ extended: false }));

//we can specify the number of files to parse :As we have Only one file we specifies single('image') image is the name field in our add product form..and it'll store the info in req.file
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
//for sending css and js files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

//This middleware will automatically sets cookie and read a cookie and add req.session property to all  incoming requests

app.use(
  session({
    secret: 'My secreat key in production this string sholud be long',
    resave: false,
    saveUninitialized: false,
    store: store,
    // cookie:{maxAge:1000000}--> like this we can configure cookies
  })
);

//The following 2 should be intialized after session is created
//Enabling csrf protection , csrfProtection is a function
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

//adding user to each request
app.use((req, res, next) => {
  if (!req.session.user) return next();
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user; //user points to complete user model in mongoose
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

//Instead of adding isAuthenticated and csrf to each controller ,we can use res.locals ---> these fields will be sent to each render pages automatically. //so we can delete isAuthenticated in all the controllers

app.use(shopRoutes);
app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use(errorController.get404);
app.use('/500', errorController.get500);
app.use((error, req, res, next) => {
  res.status(500).render('500', {
    message: error.stack,
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn,
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    /* 'Dummy user creation
    User.findOne().then(user => {
      if (!user) {
        const user = new User({
          name: 'Chetu',
          email: 'chetu@gmail.com',
          cart: {
            item: [],
          },
        });
        user.save();
      }
    }); */
    app.listen(process.env.PORT || 8080);
  })
  .catch(err => console.log(err));
