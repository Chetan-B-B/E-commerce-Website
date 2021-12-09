const crypto = require('crypto'); //--> Available in nodeJS
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const { validationResult } = require('express-validator');

const User = require('../models/user');

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        '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',
    },
  })
);

exports.getLogin = (req, res, next) => {
  //const isLoggedIn = req.get('Cookie').split(';')[2].trim().split('=')[1] === 'true';
  //.split(';')[2] ---> 2 is not fixed i.e other modules or chrome extension can insert the cookies.
  //If we not specify the life time of as cookie it Will be destoyed once browser is closed
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render('auth/login', {
    pageTitle: 'Welcome',
    path: '/login',
    isAuthenticated: req.session.isLoggedIn,
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
    },
    validateErrors: [],
  });
};

exports.postLogin = (req, res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validateErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid Email',
          oldInput: {
            email: email,
            password: password,
          },
          validateErrors: [],
        });
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.user = user;
            req.session.isLoggedIn = true;
            return req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          }
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid Password',
            oldInput: {
              email: email,
              password: password,
            },
            validateErrors: [],
          });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => {
      const error = new Error(err);

      return next(error);
    });
};

exports.postLogOut = (req, res) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      name: '',
      confirmPassword: '',
    },
    validateErrors: [],
  });
};

//U can use unique() property of Sql(mongoose) to check each email to be unique. or loop in each User and find whether email exists or not
exports.postSignup = (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        name: name,
        confirmPassword: confirmPassword,
      },
      validateErrors: errors.array(),
    });
  }
  bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        name: name,
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then(result => {
      res.redirect('/login');
      /*--->to work this we need to have a valid mail id .
          return transporter.sendMail({
            to: email,
            from: 'shop@node-complete.com',
            subject: 'Signup succeeded!',
            html: '<h1>You successfully signed up!</h1>',
          }); */
    })
    .catch(err => {
      const error = new Error(err);

      return next(error);
    });
};
/* 
exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/pass_reset', {
    path: '/reset',
    pageTitle: 'Reset password',
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 360000;
        return user.save();
      })
      .then(result => {
        if (result) res.redirect('/');
        /* we need a verify 'from' adress to use sendGrid
         transporter.sendMail({
          to: req.body.email,
          from: 'shop@node-complete.com',
          subject: 'Password reset',
          html: `
          <p>You requested a password</p>
          <P> click this  <a href="http://localhost:8080/reset/${token}">link</a> to set a new password</p>
          `,
        }); 
      })
      .catch(err => {
        console.log(err);
      });
  });
};
 */
