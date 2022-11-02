require("dotenv").config();

//port and mongodb uri are
const PORT = process.env.PORT || 3001;

//Mongodb uri
const MONGODB_URI = process.env.NODE_ENV === 'test' 
  ? "mongodb+srv://khmyat1999:Pyaepyae710520@project-management.f5ztsex.mongodb.net/ProjectApp?retryWrites=true&w=majority"
  : process.env.MONGODB_URI

//export mongodb uri and port
module.exports = {
  MONGODB_URI,
  PORT,
};