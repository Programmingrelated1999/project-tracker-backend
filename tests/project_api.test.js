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
const Bugs = require("../models/bugs");

//import testHelper
const testHelper = require("./test_helper");

//initial data
const initialUsers = testHelper.initialUsers;
const initialProjects = testHelper.initialProjects;
const initialTasks = testHelper.initialTasks;
const initialBugs = testHelper.initialBugs;

//initial token
let token;

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

    const creatorUser = await Users.findOne({name: initialUsers[0].name});
    const userToken = {
        username: creatorUser.username,
        id: creatorUser._id
    }
    token = 'bearer ' + jwt.sign(userToken, process.env.SECRET);
}, 10000);

//Task GET method
describe('project GET methods', () => {
    //test if the response is in json type
    test('projects are returned as json', async () => {
        await api.get('/api/projects').expect(200).expect('Content-Type', /application\/json/)
    });

    //test if the Get method returns all
    test('all projects are returned', async () => {
        const response = await api.get('/api/projects')
        expect(response.body).toHaveLength(initialProjects.length);
    });
        
    //test GET user method by id
    test('a project is returned by id', async () => {
        //get all projects and store the project user's id and name for checking
        const projectArrayResponse = await Projects.find({});
        const idToCheck = projectArrayResponse[0].id;
        const projectNameCheck = projectArrayResponse[0].name;
        //use the first project's id to find a project by Id, if the response is the same project(check by name), test pass
        const projectSingleResponse = await api.get(`/api/projects/${idToCheck}`);
        expect(projectSingleResponse.body.name).toEqual(projectNameCheck);
        expect(projectSingleResponse.body.status).toEqual(false);
    },10000);
});

//Project POST METHOD
describe('project POST Method', () => {
    //test POST task method to make sure that a project is successfully created without invite list.
    test('a project is successfully added', async () => {
      //get first creator for the task
      const creator = await Users.findOne({name: initialUsers[0].name});

      //new project to be added
      const newProject =  {
          name: "Project 3",
          description: "Project Description 3",
          createdDate: Date.now()
      };

      //post the project
      const createdProjectResponse = await api.post('/api/projects').send(newProject).set('Authorization', token);

      //test if the projects count is increased by 1.
      const allProjects = await Projects.find({});
      expect(allProjects).toHaveLength(initialProjects.length + 1);
      //first get the createdProject in a correct forma, then check if the createdDate is in Date format
      const createdProject = await Projects.findById(createdProjectResponse.body.id);
      expect(createdProject.createdDate).toBeInstanceOf(Date);
      //check if the creator is createdProject.creator
      expect(createdProject.creator).toEqual(creator._id);
    });

    //test POST task method to make sure that a project is successfully created without invite list and the creator projects include the project
    test('a project added, the creator must be updated to include project', async () => {

      //new project to be added
      const newProject =  {
          name: "Project 3",
          description: "Project Description 3",
          createdDate: Date.now()
      };

      //post the project
      const createdProjectResponse = await api.post('/api/projects').send(newProject).set('Authorization', token);
      //get the user again after creation
      const creatorCheck = await Users.findOne({name: initialUsers[0].name});
      //since the creatorCheck.projects contains objects by id will need to transform them into strings for comparison
      const creatorCheckProjects = await creatorCheck.projects.map((project) => String(project));
      expect(creatorCheckProjects).toContain((String(createdProjectResponse.body.id)));
    });

    //test POST task method to make sure that a project is successfully created with invite list and invites have the project saved in their projectInvites.
    test('a project added with invites, invites must be included and invites should have created project id', async () => {
      //get first creator for the task, get next 2 users and add them to the invite list
      const invite1 = await Users.findOne({name: initialUsers[1].name});
      const invite2 = await Users.findOne({name: initialUsers[2].name});
      const inviteList = [invite1._id, invite2._id];

      //new project to be added
      const newProject =  {
          name: "Project 3",
          description: "Project Description 3",
          createdDate: Date.now(),
          invites: inviteList
      };

      //post the project, get the response with the response.id(which is a string) get the object created.
      const createdProjectResponse = await api.post('/api/projects').send(newProject).set('Authorization', token);
      const postedProjectForCheck = await Projects.findById(createdProjectResponse.body.id);

      //check the objects, cannot let object comparison with toContain, use toContainEqual
      for(let invite of inviteList){
        expect(postedProjectForCheck.invites).toContainEqual(invite);
        const invitedUser = await Users.findById(invite);
        expect(invitedUser.projectInvites).toContainEqual(postedProjectForCheck._id);
      }
    });
});

//Project PUT Method
describe('project PUT Method', () => {

    //project PUT method to make sure that a project is updated with basics name and description.
    test('a project is successfully updated with basic information', async () => {
      //get first project and id for PUT link
      const project = await Projects.findOne({name: initialProjects[0].name});
      //both _id and id works here. (TESTED)
      const id = project.id;
    
      //update Project for sending data
      const updateProject = {
        name: "Project 6",
        description: "Project Description 6",
      }

      await api.put(`/api/projects/${project.id}`).send(updateProject).set('Authorization', token);

      const updatedProject = await Projects.findById(id);
      expect(updatedProject.name).toEqual(updateProject.name);
      expect(updatedProject.description).toEqual(updateProject.description);
    });

    //project PUT method to make sure that a project can be updated to invite users. 
    //first create a user, put it in invite list. Then remove the user from the invite list. 
    test('a project is successfully updated to add invites', async () => {
        //get the first project to update
        const project = await Projects.findOne({name: initialProjects[0].name});
        const projectId = project.id;

        //create the first additional user. put the user to the invite list. saved User is the response. 
        let newUser = testHelper.additionalUsers[0];
        newUser.passwordHash = await bcrypt.hash('sekret', 10);
        const userToCreate = new Users(newUser);
        const savedUser = await userToCreate.save();

        const updateData = {
            addInvites: [savedUser._id]
        }

        //response is to get the project. Check if the invites conatin savedUser.
        //userAfterUpdate to check if the user contains project in projectInvitees.
        const response = await api.put(`/api/projects/${projectId}`).send(updateData).set('Authorization', token);
        const userAfterUpdate = await Users.findOne({name: testHelper.additionalUsers[0].name});
        expect(response.body.invites).toContain(savedUser.id);
        expect(userAfterUpdate.projectInvites).toContainEqual(project._id);
    });

    //project PUT method to make sure that a project can remove users
    test('a project is successfully updated to remove users', async () => {
      //get first project, its user admin, developer, and client. 
      const project = await Projects.findOne({name: initialProjects[0].name});
      const userToDeleteAdmin = await Users.findOne({name: initialUsers[1].name});
      const userToDeleteDeveloper = await Users.findOne({name: initialUsers[2].name});
      const userToDeleteClient = await Users.findOne({name: initialUsers[3].name});

      //removeUsers set to a list of users of admin, developer, and client.
      const updateData = {
        removeUsers: [userToDeleteAdmin._id, userToDeleteDeveloper._id, userToDeleteClient._id]
      }
      //api method
      const response = await api.put(`/api/projects/${project._id}`).send(updateData).set('Authorization', token);

      //check if the admins, developes, and clients count got reduced by 1.
      expect(response.body.admins).toHaveLength(project.admins.length - 1);
      expect(response.body.developers).toHaveLength(project.developers.length - 1);
      expect(response.body.clients).toHaveLength(project.clients.length - 1);
    });

    //project PUT method to make sure that a project's user role is updated
    //error if the user does not exists or the userrole does not exist
    test('a project is successfully updated with user Roles', async () => {
      //get first project and 4th user id for PUT link. 4th user is the client
      const project = await Projects.findOne({name: initialProjects[0].name});
      const user = await Users.findOne({name: initialUsers[3].name});
    
      //update Project for sending data
      const updateData = {
        role: "developer"
      }

      //make a PUT request, current user role is client, should be developer after update.
      await api.put(`/api/projects/${project.id}/${user.id}`).send(updateData).set('Authorization', token);

      //find updatedproject, check if developers increased by 1 and clients decrease by 1.
      const updatedProject = await Projects.findById(project.id);
      expect(updatedProject.developers).toHaveLength(project.developers.length + 1);
      expect(updatedProject.clients).toHaveLength(project.clients.length - 1);
    });

});

//Project DELETE METHOD
describe('project DELETE Method', () => {
    //test DELETE task method to make sure that a project is successfully deleted.
    test('a project is successfully deleted', async () => {
        const projectToDelete = await Projects.findOne({name: initialProjects[0].name});
        
        await api.delete(`/api/projects/${projectToDelete.id}`).set('Authorization', token).set('Authorization', token);

        const allProjects = await Projects.find({});
        expect(allProjects).toHaveLength(initialProjects.length-1);
    }, 10000);

    //test DELETE task method to make sure that unauthorized users cannot delete, will return an error code.
    test('a project is not deleted if not authorized', async () => {
        const projectToDelete = await Projects.findOne({name: initialProjects[0].name});

        const adminUser = await Users.findOne({name: initialUsers[1].name});
        const adminToken = {
            username: adminUser.username,
            id: adminUser._id
        }
        let unauthorizedToken = 'bearer ' + jwt.sign(adminToken, process.env.SECRET);
        
        const response = await api.delete(`/api/projects/${projectToDelete.id}`).set('Authorization', unauthorizedToken);
        expect(response.status).toEqual(401);
    }, 10000);

    //test DELETE task method to make sure that a project is successfully deleted.
    test('when a project is deleted, its users are deleted', async () => {
        //delete the first project
        const projectToDelete = await Projects.findOne({name: initialProjects[0].name});
        
        //add all users to userList 
        let userList = [];
        userList = userList.concat(projectToDelete.creator);
        userList = userList.concat(projectToDelete.admins);
        userList = userList.concat(projectToDelete.developers);
        userList = userList.concat(projectToDelete.clients);
        userList = userList.concat(projectToDelete.invites);
        
        //delete request
        await api.delete(`/api/projects/${projectToDelete.id}`).set('Authorization', token);

        //for user of userList find the user and get the user's projects and projectsInvites, they should not have the deleted project id
        for(let user of userList){
            const userObject = await Users.findById(user);
            const projectsToCheck = userObject.projects.map((project) => String(project));
            const projectsInvitesToCheck = userObject.projects.map((projectInvites) => String(projectInvites));
            expect(projectsToCheck).not.toContain(projectToDelete.id);
            expect(projectsInvitesToCheck).not.toContain(projectToDelete.id);
        }
    });

    //test DELETE task method to make sure that a project's tasks are successfully deleted (Haven't check if the tasks disappear from users)
    test('when a project is deleted, its tasks are deleted along with users associated with it', async () => {
        //delete the first project
        const projectToDelete = await Projects.findOne({name: initialProjects[0].name});
        
        //delete request
        await api.delete(`/api/projects/${projectToDelete.id}`).set('Authorization', token);

        //get all tasks, it will be reduced by 2 since 2 were deleted.
        const allTasks = await Tasks.find({});
        expect(allTasks).toHaveLength(initialTasks.length-2);
    });

    //test DELETE bug method to make sure that a project's bugs are successfully deleted (Haven't check if the bugs disappear from users)
    test('when a project is deleted, its bugs are deleted along with users associated with it', async () => {
        //delete the first project
        const projectToDelete = await Projects.findOne({name: initialProjects[0].name});
        
        //delete request
        await api.delete(`/api/projects/${projectToDelete.id}`).set('Authorization', token);

        //get all bugs, it will be reduced to 0 since all bugs are in first project.
        const allBugs = await Bugs.find({});
        expect(allBugs).toHaveLength(0);
    }, 10000);
});

afterAll(() => {
    mongoose.connection.close()
})