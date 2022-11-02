//create a userRouter
const userRouter = require("express").Router();

//import bcrypt
const bcrypt = require('bcrypt');

//import Helpers
const { removeAUserFromTasks } = require("../helpers/taskHelper");
const { removeAUserFromBugs } = require("../helpers/bugHelper");
const { removeAListOfTasksFromUser, removeAListOfBugsFromUser } = require("../helpers/userHelper");

//import Models
const Projects = require("../models/projects");
const Users = require("../models/users");
const Tasks = require("../models/tasks");
const Bugs = require("../models/bugs");

//GET ALL
userRouter.get("/", async (request, response, next) => {
  try{  
    const allUsers = await Users.find({});
    response.json(allUsers);
  } catch(exception){
    next(exception);
  }
})

//GET ONE
userRouter.get("/:id", async (request, response) => {
  const userToReturn = await Users.findById(request.params.id).populate('projectInvites', {name: 1, description: 1})
  .populate('tasks', {name: 1, description: 1, createdDate: 1, endDate: 1, project: 1, status: 1})
  .populate('bugs', {name: 1, description: 1, createdDate: 1, endDate: 1, project: 1, status: 1})
  .populate('projects', {name: 1, description: 1, createdDate: 1, endDate: 1});
  response.json(userToReturn)
})

//POST
//create a new user only required name, username, and password.
userRouter.post("/", async (request, response) => {
    //bcrypt setup, with salt rounds 10 and create a password hash
    const saltRounds = 10;
    if(!request.body.password){
      response.status(403).json("error password")
    }
    const passwordHash = await bcrypt.hash(request.body.password, saltRounds);

    //a new user model with name, username, and passwordHash
    const user = new Users({name: request.body.name, username: request.body.username, passwordHash: passwordHash});
    let savedUser;
    try{
      //save the user. 
      savedUser = await user.save();
    } catch(error){
      response.status(403).json(error);
    }
    response.json(savedUser);
});

//PUT
//update a user by id
userRouter.put("/:id", async (request, response) => {
  const user = await Users.findById(request.params.id);
  user.name = request.body.name? request.body.name: user.name;
  user.username = request.body.username? request.body.username: user.username;

  //if user leave tasks
  if(request.body.leaveTask){
    const taskToUpdate = await Tasks.findById(request.body.leaveTask);
    taskToUpdate.assigned = taskToUpdate.assigned.filter((taskUser) => String(taskUser) !== String(user._id));
    await taskToUpdate.save();
    user.tasks = user.tasks.filter((task) => String(task) !== String(taskToUpdate._id));
  }

  //if user leave bugs
  if(request.body.leaveBug){
    const bugToUpdate = await Bugs.findById(request.body.leaveBug);
    bugToUpdate.assigned = bugToUpdate.assigned.filter((bugUser) => String(bugUser) !== String(user._id));
    await bugToUpdate.save();
    user.bugs = user.bugs.filter((bug) => String(bug) !== String(bugToUpdate._id));
  }

  //if user Leaves Projects
  if(request.body.leaveProject){
    const projectToUpdate = await Projects.findById(request.body.leaveProject);
    projectToUpdate.developers = projectToUpdate.developers.filter((userElement) => String(userElement) !== String(user._id));
    projectToUpdate.admins = projectToUpdate.admins.filter((userElement) => String(userElement) !== String(user._id));
    projectToUpdate.clients = projectToUpdate.clients.filter((userElement) => String(userElement) !== String(user._id));

    //find commont tasks,bugs between projects and users. The common list means that user is assigend to the project's tasks/bugs. Remove user from Tasks/bugs.
    const commonTasksInProjectAndUser = projectToUpdate.tasks.filter(taskElement => user.tasks.includes(taskElement));
    const commonBugsInProjectAndUser = projectToUpdate.bugs.filter(bugElement => user.bugs.includes(bugElement));
    removeAUserFromTasks(commonTasksInProjectAndUser, user._id);
    removeAUserFromBugs(commonBugsInProjectAndUser, user._id);
    removeAListOfTasksFromUser(commonTasksInProjectAndUser, user);
    removeAListOfBugsFromUser(commonBugsInProjectAndUser, user);    
    user.projects = user.projects.filter((projectElement) => String(projectElement) !== String(projectToUpdate._id));

    await projectToUpdate.save();
  }

  if(request.body.acceptInvite){
    try{
      const acceptInviteProject = await Projects.findById(request.body.acceptInvite);
      acceptInviteProject.invites = acceptInviteProject.invites.filter((userElement) => String(userElement) !== String(user._id));
      user.projectInvites = user.projectInvites.filter((projectElement) => String(projectElement) !== String(acceptInviteProject._id));
      acceptInviteProject.developers = acceptInviteProject.developers.concat(user._id);
      user.projects = user.projects.concat(acceptInviteProject._id);
      await acceptInviteProject.save();
    }catch (exception){
      response.status(401).json({error: "Project cannot be found"});
    }
  }

  if(request.body.rejectInvite){
    try{
      const rejectInviteProject = await Projects.findById(request.body.rejectInvite);
      rejectInviteProject.invites = rejectInviteProject.invites.filter((userElement) => String(userElement) !== String(user._id));
      user.projectInvites = user.projectInvites.filter((projectElement) => String(projectElement) !== String(rejectInviteProject._id));
      await rejectInviteProject.save();
      } catch(exception) {
      response.status(401).json({error: "Project cannot be found"});
    }
  }
  
  const savedUser = await user.save();
  response.json(savedUser);
});

//DELETE
userRouter.delete("/:id", async (request, response) => {
  const user = await Users.findById(request.params.id);

  //get all user related data to remove users
  const userProjects = user.projects;
  const userProjectInvites = user.projectInvites;
  const userTasks = user.tasks;
  const userBugs = user.bugs;

  //remove user from projects.
  for(let project of userProjects){
    const projectToUpdate = await Projects.findById(project);
    projectToUpdate.developers = projectToUpdate.developers.filter((userElement) => String(userElement) !== String(user._id));
    projectToUpdate.admins = projectToUpdate.admins.filter((userElement) => String(userElement) !== String(user._id));
    projectToUpdate.clients = projectToUpdate.clients.filter((userElement) => String(userElement) !== String(user._id));
    await projectToUpdate.save();
  }
  
  //remove user from projects Invites.
  for(let project of userProjectInvites){
    const projectToUpdate = await Projects.findById(project);
    projectToUpdate.clients = projectToUpdate.clients.filter((userElement) => String(userElement) !== String(user._id));
    await projectToUpdate.save();
  }

  //remove user from tasks
  for(let task of userTasks){
    const taskToUpdate = await Tasks.findById(task);
    taskToUpdate.assigned = taskToUpdate.assigned.filter((userElement) => String(userElement) !== String(user._id));
    await taskToUpdate.save();
  }

  //remove user from bugs
  for(let bug of userBugs){
    const bugToUpdate = await Bugs.findById(bug);
    bugToUpdate.assigned = bugToUpdate.assigned.filter((userElement) => String(userElement) !== String(user._id));
    await bugToUpdate.save();
  }

  const removedUser = await user.remove();
  response.json(removedUser);
});

module.exports = userRouter;