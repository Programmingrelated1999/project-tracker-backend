//require Modals
const Tasks = require("../models/tasks");
const Projects = require("../models/projects");
const Users = require("../models/users");
const Bugs = require("../models/bugs");

//For each task in user tasks, if it is in listOfTasks, remove it.
const removeAListOfTasksFromUser = async(listOfTasks, user) => {
    user.tasks = user.tasks.filter((task) => listOfTasks.includes(task));
}

//For each bug in user bugs, if it is in listOfBugs, remove it.
const removeAListOfBugsFromUser = async(listOfBugs, user) => {
    user.bugs = user.bugs.filter((bug) => listOfBugs.includes(bug));
}

//export
module.exports = {removeAListOfTasksFromUser, removeAListOfBugsFromUser};