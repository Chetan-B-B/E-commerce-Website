const express = require('express');

const authController = require('../controllers/auth');
const { check, body } = require('express-validator');
const User = require('../models/user');

const router = express.Router();
//const isAuth = require('../middleware/is-auth');-->setting isAuth here is worst bcz u need to login to see login page which is not good

router.get('/login', authController.getLogin);
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please Enter Valid Email Address')
      .normalizeEmail(),
    body('password', ' Please Enter a valid password ')
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);
router.post('/logout', authController.postLogOut);
router.get('/signup', authController.getSignup);
router.post(
  '/signup',
  [
    check('email')
      .isEmail()
      .withMessage('Please Enter Valid Email ')
      .custom((value, { req }) => {
        /* //This is just an Example for custom validation
        if (value === 'test2@test.com') {
          throw new Error('This Email address is Forbidden');
        }
        return true; //this is for all other value which are  not test@test.com 
        */

        return User.findOne({ email: value }).then(userDoc => {
          if (userDoc) {
            return Promise.reject(
              'E-Mail exists already, please pick a different one.'
            );
          }
        });
      })
      .normalizeEmail(),
    //we can use either body/check
    body(
      'password',
      ' Please Enter a  password with only numbes and characters and atleast 5 characters'
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords have to match!');
        }
      }),
  ],
  authController.postSignup
);
/* router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset); */

module.exports = router;
