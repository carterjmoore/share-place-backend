const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'

    if (!token) {
      throw new Error('Authentication failed.');
    }

    const decodedToken = jwt.verify(
      token,
      'ivI3HoaBgt2pLWZU5YZLsm77XbSoj52FwZwQH8dh'
    );

    req.userData = { userId: decodedToken.userId };

    next();
  } catch (err) {
    if (!token) {
      return next(new HttpError('Authentication failed.', 401));
    }
  }
};
