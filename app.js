//MODULES
//express app setup
const express = require("express");
const app = express();

//routers import
const userRouter = require("./controllers/userRouter");
const projectRouter = require("./controllers/projectRouter");
const bugRouter = require("./controllers/bugRouter");
const taskRouter = require("./controllers/taskRouter");
const loginRouter = require("./controllers/loginRouter");

//cross-origin resource sharing import
const cors = require("cors");

//utils
const config = require("./utils/config");
const logger = require("./utils/logger");

//mongoose
const mongoose = require("mongoose");

//connect to database
mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    logger.info("connected to MongoDB");
  })
  .catch((error) => {
    logger.error("error connecting to MongoDB:", error.message);
  });

//cross origin
app.use(cors());

//transform all incoming request body into javascript object
app.use(express.json());

//Routers
//bugsRouter root as /api/bugs
app.use("/login", loginRouter);
//userRouter root as /api/users
app.use("/api/users", userRouter);
//projectRouter root as /api/projects
app.use("/api/projects", projectRouter);
//taskRouter root as /api/tasks
app.use("/api/tasks", taskRouter);
//bugsRouter root as /api/bugs
app.use("/api/bugs", bugRouter);

//exports
module.exports = app;