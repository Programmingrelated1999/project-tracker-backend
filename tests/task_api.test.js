//import supertest, mongoose, and app for testing 
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')

//create an api with supertest.
const api = supertest(app)

//import bcrypt
const bcrypt = require('bcrypt');

//import jwt
const jwt = require('jsonwebtoken');

//import Models
const Tasks = require("../models/tasks");
const Projects = require("../models/projects");
const Users = require("../models/users");

//import testHelper
const testHelper = require("./test_helper");

//initial data
const initialUsers = testHelper.initialUsers;
const initialProjects = testHelper.initialProjects;
const initialTasks = testHelper.initialTasks;
const additionalUsers = testHelper.additionalUsers;

let token;

//setting data before each test is run. 
beforeEach(async () => {
    await Users.deleteMany({});
    await Projects.deleteMany({});
    await Tasks.deleteMany({});
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

    const adminUser = await Users.findOne({name: initialUsers[1].name});
    const userForToken = {
        username: adminUser.username,
        id: adminUser._id,
    }
    token = 'bearer ' + jwt.sign(userForToken, process.env.SECRET);
});

//Task GET method
describe('task GET methods', () => {
    //test if the response is in json type
    test('tasks are returned as json', async () => {
        await api.get('/api/tasks').expect(200).expect('Content-Type', /application\/json/)
    })

    //test if all tasks are returned
    test('all tasks are returned', async () => {
        const response = await api.get('/api/tasks')
        expect(response.body).toHaveLength(initialTasks.length);
    })

    //test GET user method by id
    test('a task is returned by id', async () => {
    //get all users and store the first user's id and name for checking
    const taskArrayResponse = await Tasks.find({});
    const idToCheck = taskArrayResponse[0].id;
    const taskNameCheck = taskArrayResponse[0].name;
    //use the first user's id to get a user by id request, if the response is the same user(check by name), test pass
    const taskSingleResponse = await api.get(`/api/tasks/${idToCheck}`);
    expect(taskSingleResponse.body.name).toEqual(taskNameCheck);
    expect(taskSingleResponse.body.status).toEqual(false);
    });
})

//Task POST METHOD
describe('task POST Method', () => {
    //test POST task method to make sure that a task is successfully added.
    test('a task is successfully added', async () => {
      //get first project for the task
      const project = await Projects.findOne({name: initialProjects[0].name});
      //new task to be added
      const newTask =  {
          name: "Task 5",
          description: "Task Description 5",
          project: project._id,
      };
      //post the task
      await api.post('/api/tasks').send(newTask).set('Authorization', token);
      //test if the tasks count is increased by 1.
      const response = await api.get('/api/tasks');
      expect(response.body).toHaveLength(initialTasks.length + 1)
      //test if the newly added task name is in the array
      const names = response.body.map((object) => object.name);
      expect(names).toContain('Task 5');
    });

    //test POST task method to check if createdDate is added when a task is created
    test('a task created contains createdDate variable in Date', async () => {
        //get first project for the task
        const project = await Projects.findOne({name: initialProjects[0].name});
        //new task to be added
        const newTask =  {
            name: "Task 5",
            description: "Task Description 5",
            project: project._id,
        };
        //post the task
        await api.post('/api/tasks').send(newTask).set('Authorization', token);
        //test if the newly added task contains createdDate variable which is in Date format
        const task = await Tasks.findOne({name: "Task 5"});
        expect(task.createdDate).toBeInstanceOf(Date);
    });
  
    //test POST task method to check if createdDate is added when a task is created
    test('a task created contains createdDate variable in Date', async () => {
        //get first project for the task
        const project = await Projects.findOne({name: initialProjects[0].name});
        //new task to be added
        const newTask =  {
            name: "Task 5",
            description: "Task Description 5",
            project: project._id,
        };
        //post the task
        await api.post('/api/tasks').send(newTask).set('Authorization', token);
        //test if the newly added task contains createdDate variable which is in Date format
        const task = await Tasks.findOne({name: "Task 5"});
        expect(task.createdDate).toBeInstanceOf(Date);
    });
});

//Task PUT Method
describe('task PUT Method', () => {
    //test PUT task method to make sure that a task is successfully updated with data without linking.
    test('a task is successfully updated with data without linking', async () => {
      //get first task and id for PUT link
      const task = await Tasks.findOne({name: initialTasks[0].name});
      const id = task.id;
    
      const updateTask = {
        name: "Task 6",
        description: "Task Description 6",
      }

      await api.put(`/api/tasks/${task.id}`).send(updateTask).set('Authorization', token);

      const updatedTask = await Tasks.findById(id);
      expect(updatedTask.name).toEqual(updateTask.name);
      expect(updatedTask.description).toEqual(updateTask.description);
    });

    //test PUT task method to make sure a task can status can be updated.
    test('a task status can be updated', async () => {
      //get first task and id for PUT link
      const task = await Tasks.findOne({name: initialTasks[0].name});
      const id = task.id;
    
      //status is set to true
      const updateTask = {
        status: true,
      }

      //API method
      await api.put(`/api/tasks/${task.id}`).send(updateTask).set('Authorization', token);

      //check if updated Task status is true
      const updatedTask = await Tasks.findById(id);
      expect(updatedTask.status).toEqual(true);
    });

    //test PUT task method to make sure that a task is successfully updated with data without linking.
    test('a task is successfully updated with the user linking', async () => {
        //get first task and id for PUT link, store the initial Length of assigned list for validation of the updated assigned list.
        const task = await Tasks.findOne({name: initialTasks[0].name});
        const id = task._id;

        //create new Users from additional users for adding users.
        let newUsersIdArray = [];
        for (let user of additionalUsers) {
            user.passwordHash = await bcrypt.hash('sekret', 10);
            let userObject = new Users(user)
            const newUser = await userObject.save()
            newUsersIdArray = newUsersIdArray.concat(newUser._id);
        }

        //update Task has corrent length after checking. 
        const updateTask = {
            name: "Task 6",
            assigned: task.assigned.concat(newUsersIdArray)
        }

        const updatedTaskResponse = await api.put(`/api/tasks/${task.id}`).send(updateTask).set('Authorization', token);
        const updatedTaskAssign = updatedTaskResponse.body.assigned.map((user) => String(user));
        expect(updatedTaskAssign).toHaveLength(task.assigned.length + 2);
        
        for( let user of newUsersIdArray){
            let checkingUser = await Users.findById(user);
            const tasksForCheck = checkingUser.tasks.map((task) => String(task));
            expect(tasksForCheck).toContain(String(id));
        }
    });
});

//Task DELETE Method
describe('task DELETE Method', () => {
    //test to see if a task can be succesfully deleted from a list.
    test('a task is successfully deleted', async() => {
      //get first task and id for DELETE link
      const taskToDelete = await Tasks.findOne({name: initialTasks[0].name});

      //make DELETE request and get all the tasks.
      await api.delete(`/api/tasks/${taskToDelete.id}`).set('Authorization', token);
      const tasks = await Tasks.find({});

      //the tasks list should have length one lower than the initial tasks length since one got deleted.
      expect(tasks).toHaveLength(initialTasks.length-1);
    })

    //test to see if the users and projects task list got updated after the task got deleted
    test('deleting a task would remove the task from the user and project task list', async() => {
      //get first task and id for DELETE link
      const taskToDelete = await Tasks.findOne({name: initialTasks[0].name});

      //variable taskToDeleteId stores delete task id for validation. The user list contains list of ids of users from task assigned. The project id is the project of the task.
      const taskToDeleteId = taskToDelete.id;
      const userList = taskToDelete.assigned.map((user) => user);
      const projectId = taskToDelete.project;

      //make a delete request.
      await api.delete(`/api/tasks/${taskToDelete.id}`).set('Authorization', token);

      //check if the project contains the task. It should not contain since the task got deleted. 
      const projectToCheck = await Projects.findById(projectId);
      expect(projectToCheck.tasks).not.toContain(taskToDeleteId);

      //check if the users contain the task. It should not contain since the task got deleted. 
      for(let user of userList){
        const userToCheck = await Users.findById(user);
        expect(userToCheck.tasks).not.toContain(taskToDeleteId);
      }
    })
})

afterAll(() => {
    mongoose.connection.close()
}) 