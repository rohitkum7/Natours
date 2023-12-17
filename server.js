const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 🚨 Shutting Down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' }); // This happens to do once, then it will be fetched into Node Enviroment. and can be assisible anywhere in the node project, weather the file is imported or not.

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
    // console.log(con.connections);
    console.log('DB connection Succesful!!');
  });

const app = require('./app');
// console.log(process.env);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 🚨 Shutting Down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
