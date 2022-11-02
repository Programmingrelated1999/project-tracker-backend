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
const Bugs = require("../models/bugs");
const Projects = require("../models/projects");
const Users = require("../models/users");

//import testHelper
const testHelper = require("./test_helper");

//initial data
const initialUsers = testHelper.initialUsers;
const initialProjects = testHelper.initialProjects;
const initialBugs = testHelper.initialBugs;
const additionalUsers = testHelper.additionalUsers;

let token;

//setting data before each test is run. 
beforeEach(async () => {
    await Users.deleteMany({});
    await Projects.deleteMany({});
    await Bugs.deleteMany({});
    for (let user of initialUsers) {
        user.passwordHash = await bcrypt.hash('sekret', 10)
        let userObject = new Users(user)
        await userObject.save()
    }
    //get usersAfterCreation to update the projects and bugs with user id later
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
    //get projectsAfterCreation to update the bug and users with projects id later
    const projectsAfterCreation = await Projects.find({});
    const projectIds = projectsAfterCreation.map((project) => (project.id));
    //All users will have the projects as part of their projects list.
    for(let user of usersAfterCreation){
        user.projects = user.projects.concat(projectIds);
        await user.save();
    }
    //the first project will own first 2 bugs. The other will own the rest.
    for(let bug of initialBugs.slice(0,2)){
        bug.project = projectIds[0];
        bug.assigned = [].concat([projectsAfterCreation[0].admins[0], projectsAfterCreation[0].developers[0]]);
        bug.createdDate = Date.now();
        let bugObject = new Bugs(bug);
        await bugObject.save();
    }
    for(let bug of initialBugs.slice(2,initialBugs.length)){
        bug.project = projectIds[1];
        bug.assigned = [].concat(projectsAfterCreation[1].developers[0]);
        bug.createdDate = Date.now();
        let bugObject = new Bugs(bug);
        await bugObject.save();
    }
    //get bugsAfterCreation to update the projects and users with bugs id later
    const bugsAfterCreation = await Bugs.find({});
    const bugIds = bugsAfterCreation.map((bug) => (bug.id));
    projectsAfterCreation[0].bugs = projectsAfterCreation[0].bugs.concat(bugIds.slice(0,2));
    await projectsAfterCreation[0].save();
    projectsAfterCreation[1].bugs = projectsAfterCreation[1].bugs.concat(bugIds.slice(2,bugIds.length));
    await projectsAfterCreation[1].save();
    usersAfterCreation[1].bugs = usersAfterCreation[1].bugs.concat(bugIds.slice(0,2));
    await usersAfterCreation[1].save();
    usersAfterCreation[2].bugs = usersAfterCreation[2].bugs.concat(bugIds);
    await usersAfterCreation[2].save();

    const adminUser = await Users.findOne({name: initialUsers[1].name});
    const userForToken = {
        username: adminUser.username,
        id: adminUser._id,
    }
    token = 'bearer ' + jwt.sign(userForToken, process.env.SECRET);
});

//Bug GET method
describe('bug GET methods', () => {
    //test if the response is in json type
    test('bugs are returned as json', async () => {
        await api.get('/api/bugs').expect(200).expect('Content-Type', /application\/json/)
    }, 10000)

    //test if all bugs are returned
    test('all bugs are returned', async () => {
        const response = await api.get('/api/bugs')
        expect(response.body).toHaveLength(initialBugs.length);
    }, 10000)

    //test GET user method by id
    test('a bug is returned by id', async () => {
    //get all users and store the first user's id and name for checking
    const bugArrayResponse = await Bugs.find({});
    const idToCheck = bugArrayResponse[0].id;
    const bugNameCheck = bugArrayResponse[0].name;

    //use the first user's id to get a user by id request, if the response is the same user(check by name), test pass
    const bugSingleResponse = await api.get(`/api/bugs/${idToCheck}`);
    expect(bugSingleResponse.body.name).toEqual(bugNameCheck);
    expect(bugSingleResponse.body.status).toEqual(false);
    });
})

//Bug POST METHOD
describe('bug POST Method', () => {
    //test POST bug method to make sure that a bug is successfully added.
    test('a bug is successfully added', async () => {
      //get first project for the bug
      const project = await Projects.findOne({name: initialProjects[0].name});
      //new bug to be added
      const newBug =  {
          name: "Bug 5",
          description: "Bug Description 5",
          project: project._id,
      };
      //post the bug
      await api.post('/api/bugs').send(newBug).set('Authorization', token);
      //test if the bugs count is increased by 1.
      const response = await api.get('/api/bugs');
      expect(response.body).toHaveLength(initialBugs.length + 1)
      //test if the newly added bug name is in the array
      const names = response.body.map((object) => object.name);
      expect(names).toContain('Bug 5');
    });

    //test POST bug method to check if createdDate is added when a bug is created
    test('a bug created contains createdDate variable in Date', async () => {
      //get first project for the bug
      const project = await Projects.findOne({name: initialProjects[0].name});
      //new bug to be added
      const newBug =  {
          name: "Bug 5",
          description: "Bug Description 5",
          project: project._id,
      };
      //post the bug
      await api.post('/api/bugs').send(newBug).set('Authorization', token);
      //test if the newly added bug contains createdDate variable which is in Date format
      const bug = await Bugs.findOne({name: "Bug 5"});
      expect(bug.createdDate).toBeInstanceOf(Date);
    });

    //test POST bug method to check if createdDate is added when a bug is created
    test('a bug created contains createdDate variable in Date', async () => {
      //get first project for the bug
      const project = await Projects.findOne({name: initialProjects[0].name});
      //new bug to be added
      const newBug =  {
          name: "Bug 5",
          description: "Bug Description 5",
          project: project._id,
      };
      //post the bug
      await api.post('/api/bugs').send(newBug).set('Authorization', token);
      //test if the newly added bug contains createdDate variable which is in Date format
      const bug = await Bugs.findOne({name: "Bug 5"});
      expect(bug.createdDate).toBeInstanceOf(Date);
    });
})

//Bug PUT Method
describe('bug PUT Method', () => {
    //test PUT bug method to make sure that a bug is successfully updated with data without linking.
    test('a bug is successfully updated with data without linking', async () => {
      //get first bug and id for PUT link
      const bug = await Bugs.findOne({name: initialBugs[0].name});
      const id = bug.id;
    
      const updateBug = {
        name: "Bug 6",
        description: "Bug Description 6",
      }

      await api.put(`/api/bugs/${bug.id}`).send(updateBug).set('Authorization', token);

      const updatedBug = await Bugs.findById(id);
      expect(updatedBug.name).toEqual(updateBug.name);
      expect(updatedBug.description).toEqual(updateBug.description);
    });

    //test PUT bug method to make sure a bug can status can be updated.
    test('a bug status can be updated', async () => {
      //get first bug and id for PUT link
      const bug = await Bugs.findOne({name: initialBugs[0].name});
      const id = bug.id;
    
      //status is set to true
      const updateBug = {
        status: true,
      }

      //API method
      await api.put(`/api/bugs/${bug.id}`).send(updateBug).set('Authorization', token);

      //check if updated Bug status is true
      const updatedBug = await Bugs.findById(id);
      expect(updatedBug.status).toEqual(true);
    });

    //test PUT bug method to make sure that a bug is successfully updated with data without linking.
    test('a bug is successfully updated with the user linking', async () => {
        //get first bug and id for PUT link, store the initial Length of assigned list for validation of the updated assigned list.
        const bug = await Bugs.findOne({name: initialBugs[0].name});
        const id = bug._id;

        //create new Users from additional users for adding users.
        let newUsersIdArray = [];
        for (let user of additionalUsers) {
            user.passwordHash = await bcrypt.hash('sekret', 10);
            let userObject = new Users(user);
            const newUser = await userObject.save();
            newUsersIdArray = newUsersIdArray.concat(newUser._id);
        }

        //update Bug has corrent length after checking. 
        const updateBug = {
            name: "Bug 6",
            assigned: bug.assigned.concat(newUsersIdArray)
        }

        const updatedBugResponse = await api.put(`/api/bugs/${bug.id}`).send(updateBug).set('Authorization', token);
        const updatedBugAssign = updatedBugResponse.body.assigned.map((user) => String(user));
        expect(updatedBugAssign).toHaveLength(bug.assigned.length + 2);
        
        for( let user of newUsersIdArray){
            let checkingUser = await Users.findById(user);
            const bugsForCheck = checkingUser.bugs.map((bug) => String(bug));
            expect(bugsForCheck).toContain(String(id));
        }
    });
});

//Bug DELETE Method
describe('bug DELETE Method', () => {
    //test to see if a bug can be succesfully deleted from a list.
    test('a bug is successfully deleted', async() => {
      //get first bug and id for DELETE link
      const bugToDelete = await Bugs.findOne({name: initialBugs[0].name});

      //make DELETE request and get all the bugs.
      await api.delete(`/api/bugs/${bugToDelete.id}`).set('Authorization', token);
      const bugs = await Bugs.find({});

      //the bugs list should have length one lower than the initial bugs length since one got deleted.
      expect(bugs).toHaveLength(initialBugs.length-1);
    })

    //test to see if the users and projects bug list got updated after the bug got deleted
    test('deleting a bug would remove the bug from the user and project bug list', async() => {
      //get first bug and id for DELETE link
      const bugToDelete = await Bugs.findOne({name: initialBugs[0].name});

      //variable bugToDeleteId stores delete bug id for validation. The user list contains list of ids of users from bug assigned. The project id is the project of the bug.
      const bugToDeleteId = bugToDelete.id;
      const userList = bugToDelete.assigned.map((user) => user);
      const projectId = bugToDelete.project;

      //make a delete request.
      await api.delete(`/api/bugs/${bugToDelete.id}`).set('Authorization', token);

      //check if the project contains the bug. It should not contain since the bug got deleted. 
      const projectToCheck = await Projects.findById(projectId);
      expect(projectToCheck.bugs).not.toContain(bugToDeleteId);

      //check if the users contain the bug. It should not contain since the bug got deleted. 
      for(let user of userList){
        const userToCheck = await Users.findById(user);
        expect(userToCheck.bugs).not.toContain(bugToDeleteId);
      }
    })
})

//close connection after all
afterAll(() => {
    mongoose.connection.close()
}) 