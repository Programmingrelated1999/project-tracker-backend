//require Modals
const Tasks = require("../models/tasks");
const Projects = require("../models/projects");
const Users = require("../models/users");
const Bugs = require("../models/bugs");

const removeAUserFromBugs = async(bugs, userId) => {
    bugs.forEach(async (bug) => {
        const bugToUpdate = await Bugs.findById(bug);
        bugToUpdate.assigned = bugToUpdate.assigned.filter((bugUser) => String(bugUser) !== String(userId));
        await bugToUpdate.save();
    })
}

module.exports = {removeAUserFromBugs};