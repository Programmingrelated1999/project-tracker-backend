//import json web token and bcrypt. 
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

//create a login Router
const loginRouter = require('express').Router()

//import Users model
const Users = require('../models/users')

//loginRouter will have POST Method
loginRouter.post('/', async (request, response) => {
  //request body will contain username and password
  const { username, password } = request.body

  //find the user and check if password is correct
  const user = await Users.findOne({ username })
  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

  //is user exists and passwordCorrect then do not return error, else return error
  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password'
    })
  }

  //create a userForToken with user name and id. 
  const userForToken = {
    username: user.username,
    id: user._id,
  }

  //create a token.
  const token = jwt.sign(userForToken, process.env.SECRET)

  //return token, username and user's name
  response
    .status(200)
    .send({ token, username: user.username, name: user.name, id: user.id});
})

module.exports = loginRouter