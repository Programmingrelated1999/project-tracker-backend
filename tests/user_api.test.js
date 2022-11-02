//import supertest, mongoose, and app for testing 
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')

//create an api with supertest.
const api = supertest(app)

//import bcrypt
const bcrypt = require('bcrypt');

//import Models
const Users = require("../models/users");
const Projects = require("../models/projects");
const Tasks = require("../models/tasks");
const Bugs = require("../models/bugs");

//import testHelper
const testHelper = require("./test_helper");

//initial data
const initialUsers = testHelper.initialUsers;
const initialProjects = testHelper.initialProjects;
const initialTasks = testHelper.initialTasks;
const initialBugs = testHelper.initialBugs;

//setting data before each test is run. 
beforeEach(async () => {
  await Users.deleteMany({});
  await Projects.deleteMany({});
  await Tasks.deleteMany({});
  await Bugs.deleteMany({});
  for (let user of initialUsers) {
      user.passwordHash = await bcrypt.hash('sekret', 10)
      let userObject = new Users(user)
      await userObject.save()
  }
  //get usersAfterCreation to update the projects and tasks with user id later
  const usersAfterCreation = await Users.find({});
  //the first user will be the creator of 2 projects. The second user will be the admin, the third user will be the developer and the fourth will be the client.
  for(let project of initialProjects){
      project.creator = usersAfterCreation[0].id;
      project.admins = [].concat(usersAfterCreation[1].id);
      project.developers = [].concat(usersAfterCreation[2]);
      project.clients = [].concat(usersAfterCreation[3]);
      project.createdDate = Date.now();
      let projectObject = new Projects(project);
      await projectObject.save();
  }
  //get projectsAfterCreation to update the task and users with projects id later
  const projectsAfterCreation = await Projects.find({});
  const projectIds = projectsAfterCreation.map((project) => (project.id));
  //All users will have the projects as part of their projects list.
  for(let user of usersAfterCreation){
      user.projects = user.projects.concat(projectIds);
      await user.save();
  }
  //the first project will own first 2 tasks. The other will own the rest.
  for(let task of initialTasks.slice(0,2)){
      task.project = projectIds[0];
      task.assigned = [].concat([projectsAfterCreation[0].admins[0], projectsAfterCreation[0].developers[0]]);
      task.createdDate = Date.now();
      let taskObject = new Tasks(task);
      await taskObject.save();
  }
  for(let task of initialTasks.slice(2,initialTasks.length)){
      task.project = projectIds[1];
      task.assigned = [].concat(projectsAfterCreation[1].developers[0]);
      task.createdDate = Date.now();
      let taskObject = new Tasks(task);
      await taskObject.save();
  }
  //get tasksAfterCreation to update the projects and users with tasks id later
  const tasksAfterCreation = await Tasks.find({});
  const taskIds = tasksAfterCreation.map((task) => (task.id));
  projectsAfterCreation[0].tasks = projectsAfterCreation[0].tasks.concat(taskIds.slice(0,2));
  await projectsAfterCreation[0].save();
  projectsAfterCreation[1].tasks = projectsAfterCreation[1].tasks.concat(taskIds.slice(2,taskIds.length));
  await projectsAfterCreation[1].save();
  usersAfterCreation[1].tasks = usersAfterCreation[1].tasks.concat(taskIds.slice(0,2));
  await usersAfterCreation[1].save();
  usersAfterCreation[2].tasks = usersAfterCreation[2].tasks.concat(taskIds);
  await usersAfterCreation[2].save();

  //create all bugs and they are under project 1 its admin and developer assigned to every bug.
  for(let bug of initialBugs){
      bug.project = projectIds[0];
      bug.assigned = [].concat([projectsAfterCreation[0].admins[0], projectsAfterCreation[0].developers[0]]);
      bug.createdDate = Date.now();
      let bugObject = new Bugs(bug);
      await bugObject.save();
  }
  //get bugsAfterCreation to update the projects and users with bugs id later
  const bugsAfterCreation = await Bugs.find({});

  const bugIds = bugsAfterCreation.map((bug) => (bug.id));
  projectsAfterCreation[0].bugs = projectsAfterCreation[0].bugs.concat(bugIds);
  await projectsAfterCreation[0].save();
  usersAfterCreation[1].bugs = usersAfterCreation[1].bugs.concat(bugIds);
  usersAfterCreation[2].bugs = usersAfterCreation[2].bugs.concat(bugIds);
  await usersAfterCreation[1].save();
  await usersAfterCreation[2].save();
}, 10000);

//User GET method
describe('user GET methods', () => {
  //test if the response is in json type
  test('users are returned as json', async () => {
    await api.get('/api/users').expect(200).expect('Content-Type', /application\/json/)
  }, 10000)
  
  //test if all users are returned by user count
  test('all users are returned', async () => {
      const response = await api.get('/api/users')
      expect(response.body).toHaveLength(initialUsers.length);
  }, 10000)
  
  //test GET user method by id
  test('a user is returned by id', async () => {
      //get all users and store the first user's id and name for checking
      const userArrayResponse = await Users.find({});
      const idToCheck = userArrayResponse[0].id;
  
      //use the first user's id to get a user by id request, if the response is the same user(check by name), test pass
      const userSingleResponse = await api.get(`/api/users/${idToCheck}`);
      expect(userSingleResponse.body.name).toEqual(userArrayResponse[0].name);
  }, 10000);
})

//User POST METHOD
describe('user POST Method', () => {
    //test POST user method to make sure that a user is successfully added.
    test('a user is successfully added', async () => {
      //new user to be added
      const newUser =  {
          name: "User 3",
          username: "UserName 12",
          password: "Password1",
      };
      const createdUserResponseBody = await api.post('/api/users').send(newUser);

      const allUsers = await Users.find({});
      expect(allUsers).toHaveLength(initialUsers.length + 1);
      
      const createdUserForCheck = await Users.findById(createdUserResponseBody.body.id);
      expect(createdUserForCheck.name).toEqual(newUser.name);
      expect(createdUserForCheck.username).toEqual(newUser.username);
    }, 10000);

    //
})

//User PUT METHOD
describe('user PUT Method', () => {
    //test PUT method to see if a user can be updated
    test('a specific user can be updated by id', async () => {
      //get all users and change the first user name and then store the first user id for PUT
      const firstUser = await Users.findOne({name: initialUsers[0].name});

      //constants for checking
      const newName = "User 4";
      const newUserName = "UserName 6";      
      const firstUserId = firstUser.id;

      const updatedData = {
        name: newName,
        username: newUserName
      }

      //updated user Name
      await api.put(`/api/users/${firstUserId}`).send(updatedData);

      //get updatedUser Information
      const updatedUser = await Users.findById(firstUserId);
      expect(updatedUser.name).toEqual(newName);      
      expect(updatedUser.username).toEqual(newUserName);  
    }, 10000);

    //test PUT method to see if a user can be updated
    test('a user leaves the project, leave tasks and bugs', async () => {
      //get all users and change the first user name and then store the first user id for PUT
      const adminUser = await Users.findOne({name: initialUsers[1].name});
      const projectToLeave = await Projects.findOne({name: initialProjects[0].name});
      const firstTaskToCheck = await Tasks.findOne({name: initialTasks[0].name});
      const firstBugToCheck = await Bugs.findOne({name: initialBugs[0].name});

      //constants for checking   
      const adminUserId = adminUser.id;

      //update Data
      const updatedData = {
        leaveProject: projectToLeave._id
      }

      //updated user Name
      await api.put(`/api/users/${adminUserId}`).send(updatedData);

      //get updatedUser Information
      const updatedUser = await Users.findById(adminUser._id);
      const updatedProject = await Projects.findById(projectToLeave._id);
      const updatedTask =  await Tasks.findById(firstTaskToCheck._id);
      const updatedBug =  await Bugs.findById(firstBugToCheck._id);
      
      //check if user have left projects
      expect(updatedUser.projects).not.toContain(projectToLeave._id);
      expect(updatedProject.admins).toHaveLength(projectToLeave.admins.length - 1);

      //check if the tasks and bugs have remove user from their assigned list.
      expect(updatedTask.assigned).toHaveLength(firstTaskToCheck.assigned.length - 1);
      expect(updatedBug.assigned).toHaveLength(firstBugToCheck.assigned.length - 1);

      //check if user have project's tasks and bugs removed from their tasks and bugs list.
      expect(updatedUser.tasks).toHaveLength(adminUser.tasks.length - 2);
      expect(updatedUser.bugs).toHaveLength(adminUser.bugs.length - 4);

    }, 10000);

    //test PUT method to see if a user can be updated
    test('a user leaves task, and bugs', async () => {
      //get the admin user of project 1, admin user leaves first task and first bug.
      const adminUser = await Users.findOne({name: initialUsers[1].name});
      const firstTaskToCheck = await Tasks.findOne({name: initialTasks[0].name});
      const firstBugToCheck = await Bugs.findOne({name: initialBugs[0].name});

      //constants for checking   
      const adminUserId = adminUser.id;

      //update Data
      const updatedData = {
        leaveTask: adminUser.tasks[0],
        leaveBug: adminUser.bugs[0]
      }

      //updated user Name
      await api.put(`/api/users/${adminUserId}`).send(updatedData);

      //get updatedUser Information
      const updatedUser = await Users.findById(adminUser._id);
      const updatedTask =  await Tasks.findById(firstTaskToCheck._id);
      const updatedBug =  await Bugs.findById(firstBugToCheck._id);

      //check if the tasks and bugs have remove user from their assigned list.
      expect(updatedTask.assigned).toHaveLength(firstTaskToCheck.assigned.length - 1);
      expect(updatedBug.assigned).toHaveLength(firstBugToCheck.assigned.length - 1);

      //check if user have project's tasks and bugs removed from their tasks and bugs list.
      expect(updatedUser.tasks).toHaveLength(adminUser.tasks.length - 1);
      expect(updatedUser.bugs).toHaveLength(adminUser.bugs.length - 1);
    }, 10000);
})

//User DELETE METHOD
describe('user DELETE method', () => {
  //test DELETE user method to make sure that a user is successfully deleted.
  test('a user is successfully removed', async () => {
    //get the users, store the ids in an array. store the first id user name, and delete the first id user
    const userArrayResponse = await api.get('/api/users');
    const idArray = userArrayResponse.body.map((user) => user.id)
    const userDeletedName = userArrayResponse.body[0].name;
    await api.delete(`/api/users/${idArray[0]}`);

    //check if users got reduced by 1. then check if the first user name got deleted.
    const response = await api.get('/api/users');
    expect(response.body).toHaveLength(initialUsers.length - 1);
    const finalUserNames = response.body.map((user)=>user.name);
    expect(finalUserNames).not.toContain(userDeletedName);
  }, 12000);

  //test DELETE user method to make sure that a user is removed from tasks and bugs when deleted.
  test('a user is removed from tasks when deleted', async() => {
    //admin of project 1 is deleted, admin is associated with 2 tasks
    const userToDelete = await Users.findOne({name: initialUsers[1].name});
    const firstTask = await Tasks.findOne({name: initialTasks[0].name});
    const secondTask = await Tasks.findOne({name: initialTasks[1].name});

    //make a user deletion
    await api.delete(`/api/users/${userToDelete.id}`);
    const firstTaskAfterUserDelete = await Tasks.findOne({name: initialTasks[0].name});
    const secondTaskAfterUserDelete = await Tasks.findOne({name: initialTasks[1].name});

    //expect user associated tasks to be updated to remove user
    expect(firstTaskAfterUserDelete.assigned).toHaveLength(firstTask.assigned.length - 1);
    expect(secondTaskAfterUserDelete.assigned).toHaveLength(secondTask.assigned.length - 1);
  }, 10000)
})


afterAll(() => {
  mongoose.connection.close()
})