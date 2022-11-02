//require Modals
const Tasks = require("../models/tasks");
const Projects = require("../models/projects");
const Users = require("../models/users");
const Bugs = require("../models/bugs");

const removeAUserFromTasks = async(tasks, userId) => {
    tasks.forEach(async (task) => {
        const taskToUpdate = await Tasks.findById(task);
        taskToUpdate.assigned = taskToUpdate.assigned.filter((taskUser) => String(taskUser) !== String(userId));
        await taskToUpdate.save();
    })
}

module.exports = {removeAUserFromTasks};