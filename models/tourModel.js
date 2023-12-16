const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModule');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], //Its a  Builin Validator
      unique: true,
      trim: true,
      maxlength: [40, 'Atour name must have less or equal in 40 character'], //Its a  Builin Validator
      minlength: [10, 'Atour name must have more or equal in 10 character'], //Its a  Builin Validator
      // validate: [validator.isAlpha, 'Name must contains alphabets only'], // custom validator using packages
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a Duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        //Its a  Builin Validator
        values: ['easy', 'medium', 'difficult'],
        message: 'Diffculty is either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      required: true,
      default: 4.5,
      min: [1, 'Raiting must be above 0'], //Its a Validator
      max: [5, 'Raiting must be below 5.0'], //Its a Validator
      set: (val) => Math.round(val * 10) / 10, // 4.666666 =~ 46.666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        // Custom Validator
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount Price({VALUE}) should be below the selling Price..',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      requried: [true, 'A tour must have a cover Image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // Longitude, Latitude
      address: String,
      description: String,
    },
    locations: [
      {
        type: { type: String, default: 'Point', enum: ['Point'] },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // add to index for geoSatial value

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
}); // using virtuals (only be used in schema, and cannot use arrow function, beacause we cant able to use this keyword inside arrow function, and also we have to give the option while running the schema for virtuals ruunning)

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT MIDDLEWARE: runs only before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Embedding Users as guide into Tours Array
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will Save Document..');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// Query Middleware
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//Refrencing 0r Normalized
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v  -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`The operation took ${Date.now() - this.start} millisec`);
  // console.log(docs);
  next();
});

//AGGREGATE MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema); // Creating model

module.exports = Tour;
