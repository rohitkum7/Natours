const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: './config.env' });
const Tour = require('./../../models/tourModel.js');
const Review = require('./../../models/reviewModel.js');
const User = require('./../../models/userModule.js');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB, {
    // .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection Succesful!!');
  });

const app = require('./../../app.js');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App Running on Port ${port}`);
});

// Reading the JSON File

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

//Import the data into DataBase

const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data Sucessfully Uploaded!!!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data Sucessfully Deleted!!!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// to run the File
// node .\dev-data\data\import_dev_data.js --delete
// node .\dev-data\data\import_dev_data.js --import

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
