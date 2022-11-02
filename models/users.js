//MONGOOSE
const mongoose = require("mongoose");

//Schema Definition
//name, bio - String, will have a list of projects, tasks, and bugs
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: ''
  },
  projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    }],
  tasks:[{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
  }],
  bugs:[{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bug",
  }],
  projectInvites:[{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
  }],
});

//setSchema
userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject.passwordHash;
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

//export
module.exports = mongoose.model("User", userSchema);