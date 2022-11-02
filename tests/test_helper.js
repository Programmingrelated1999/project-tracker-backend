//initial data
const initialUsers = [{name: "User 1", username: "UserName 1"},{name: "User 2", username: "UserName 2"},{name: "User 3", username: "UserName 3"}, {name: "User 4", username: "UserName 4"}];
const initialProjects = [{name: "Project 1", description: "Project Description 1"}, 
                         {name: "Project 2", description: "Project Description 2"}];
const initialTasks = [
                      {name: "Task 1", description: "Task Description 1"}, 
                      {name: "Task 2", description: "Task Description 2"},
                      {name: "Task 3", description: "Task Description 3"}, 
                      {name: "Task 4", description: "Task Description 4"},
                     ];
const initialBugs= [
                    {name: "Bug 1", description: "Bug Description 1"}, 
                    {name: "Bug 2", description: "Bug Description 2"},
                    {name: "Bug 3", description: "Bug Description 3"}, 
                    {name: "Bug 4", description: "Bug Description 4"},
                   ];
const additionalUsers = [{name: "User 5", username: "UserName 5"}, {name: "User 6", username: "UserName 6"}];
const additionalProjects = [{name: "Project 3", description: "Project Description 3"}];
const additionalTasks = [{name: "Task 5", description: "Task Description 5"},{name: "Task 6", description: "Task Description 6"}];
const additionalBugs = [{name: "Bug 5", description: "Bug Description 5"},{name: "Bug 6", description: "Bug Description 6"}];


//module exports
module.exports = {initialUsers, initialProjects, initialTasks, initialBugs, additionalUsers, additionalProjects, additionalTasks, additionalBugs};