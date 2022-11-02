require("dotenv").config();

//port and mongodb uri are
const PORT = process.env.PORT || 3001;

//Mongodb uri
const MONGODB_URI = process.env.NODE_ENV === 'test' 
  ? process.env.TEST_MONGODB_URI
  : process.env.MONGODB_URI

//export mongodb uri and port
module.exports = {
  MONGODB_URI,
  PORT,
};