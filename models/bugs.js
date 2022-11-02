//MONGOOSE
const mongoose = require("mongoose");

//Schema Definition
//name - String, createdDate which is required(gets its data from Date.now() when created), endDate
//description which is required, lists of users assigned to the bug and the project it belong to.
const bugSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },    
    createdDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
    },
    description:{
      type: String,
      required: true,
    },
    assigned: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    status:{
      type: String,
      enum: ['Created', 'Progress', 'Done'],
      require: true,
      default: 'Created',
    }
});

//setSchema
bugSchema.set("toJSON", {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString();
      delete returnedObject._id;
      delete returnedObject.__v;
    },
});

//export
module.exports = mongoose.model("Bug", bugSchema);