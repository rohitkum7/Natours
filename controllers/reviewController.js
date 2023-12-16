// const catchAsync = require('../utils/catchAsync.js');
const Review = require('./../models/reviewModel.js');
const factory = require('./handlerFactory.js');

// GET /tours/234125xcvbnmj/ reviews

exports.setTourUserIds = (req, res, next) => {
  // Set default values if they are not provided in the request body
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next(); // Move to the next middleware or the actual route handler
};

exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
