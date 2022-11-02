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

//initial data
let initialUser = {
    name: "User 1",
    username: "UserName 1",
}

//setting data before each test is run. 
beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password 1', 10);
    initialUser.passwordHash = passwordHash;
    await Users.deleteMany({});
    const userToCreate = new Users(initialUser);
    await userToCreate.save();
});

//Login POST METHOD
describe('login POST Method', () => {
    //test POST login to make sure a user can login
    test('a user can get a token when login in is successful', async () => {

      const loginData = {
        username: initialUser.username,
        password: 'Password 1'
      }

      //post the bug
      const loginResponse = await api.post('/login').send(loginData);

      console.log("Login Response", loginResponse.body);

      //test if login is successful, return user's name, user's userName, and token.
      expect(loginResponse.body.name).toEqual(initialUser.name);
      expect(loginResponse.body.username).toEqual(initialUser.username);
      expect.anything(loginResponse.body.token);
    });

    //test POST login to make sure a user can login
    test('a user cannot get a token when login unsuccessful', async () => {

      const loginData = {
        username: "UserName 12",
        password: 'Password 1'
      }

      //post the bug
      const loginResponse = await api.post('/login').send(loginData);

      //test if login is not successful, get error invalid username or password message. 
      expect(loginResponse.body.error).toEqual('invalid username or password');
    });
});

//close connection after all
afterAll(() => {
    mongoose.connection.close()
}) 