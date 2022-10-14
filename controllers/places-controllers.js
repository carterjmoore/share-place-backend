const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not find a place.', 500)
    );
  }

  if (!place) {
    return next(
      new HttpError('Could not find a place for the provided place id.', 404)
    );
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    return next(
      new HttpError('Fetching places failed, please try again later.', 500)
    );
  }

  if (!userWithPlaces) {
    return next(
      new HttpError('Could not find a user for the provided user id.', 404)
    );
  }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address, creator } = req.body;

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    return next(new HttpError('Creating place failed, please try again.', 500));
  }

  if (!user) {
    return next(new HttpError('Could not find user for provided id.', 404));
  }

  let location;
  try {
    location = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location,
    image: req.file.path,
    creator,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError('Creating place failed, please try again.', 500));
  }

  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not update place.', 500)
    );
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not update place.', 500)
    );
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not delete place.', 500)
    );
  }

  if (!place) {
    return next(new HttpError('Could not find place for this id.', 404));
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });

    fs.unlink(imagePath, (err) => {
      console.log(err);
    });

    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not delete place.', 500)
    );
  }

  res.status(200).json({ message: 'Deleted place' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
