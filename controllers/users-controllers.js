const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    return next(
      new HttpError('Fetching users failed, please try again later.', 500)
    );
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { name, email, password, places } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new HttpError('Signing up failed, please try again later.', 500)
    );
  }

  console.log(existingUser);
  if (existingUser) {
    return next(
      new HttpError(
        'Could not create user, a user with this email already exists.',
        422
      )
    );
  }

  const createdUser = new User({
    name,
    email,
    image:
      'https://images.pexels.com/photos/839011/pexels-photo-839011.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    password,
    places,
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(
      new HttpError('Signing up failed, please try again later.', 500)
    );
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError('Login failed, please try again later.', 500));
  }

  if (!existingUser || existingUser.password !== password) {
    return next(new HttpError('Invalid credentials, failed to log in.', 401));
  }

  res.json({ message: 'Logged in!' });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
