//create taskRouter from express Router module
const taskRouter = require("express").Router();

//require jsonwebtoken
const jwt = require('jsonwebtoken');

//require Modals
const Tasks = require("../models/tasks");
const Projects = require("../models/projects");
const Users = require("../models/users");

//get token function
const getTokenFrom = request => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
      return authorization.substring(7)
    }
    return null
}

//GET ALL
taskRouter.get("/", (request, response) => {
    Tasks.find({}).then((tasks) => {
        response.json(tasks);
    });
});

//GET ONE
taskRouter.get("/:id", async (request, response) => {
    const taskToReturn = await Tasks.findById(request.params.id).populate('assigned', {name: 1, username: 1});
    response.json(taskToReturn)
});

//POST 
//find project who create the project with project id and then create a task with name, description from request body, createdDate as current time and project set to project id
//save the task into MongoDB then with the returned object's id saved it to project's tasks.
//update the project and return newly created task.
taskRouter.post("/", async (request, response) => {
    //get token from request called to check if the header contains bearer. Then take off bearer and return token.
    const token = getTokenFrom(request);
    //decode the token into the user object which will contain username and id.
    const decodedToken = jwt.verify(token, process.env.SECRET);
    //if decode not successful, token is not valid.
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }
    //if token is valid, get user and the current project.
    const user = await Users.findById(decodedToken.id);
    const project = await Projects.findById(request.body.project);

    //check user role: user must be admin or owner to create task.
    const isUserCreator = String(project.creator) === String(user._id)? true: false;
    const isUserAdmin = project.admins.includes(user._id)? true: false;

    //if user is owner or admin, allow create task.
    if(isUserCreator || isUserAdmin){
        //createe a task object
        let task = new Tasks({
            name: request.body.name,
            createdDate: new Date().toDateString(),
            description: request.body.description,
            project: project.id,
        });

        let assignedList;

          //if there are any users invited from the project, then saved the list of users in the invite list.
        if(request.body.assigned){
            task.assigned = request.body.assigned;
            assignedList = request.body.assigned;
        }
    
        //save the task. concat the task to project tasks and save the project.
        const savedTask = await task.save();
        project.tasks = project.tasks.concat(savedTask._id);
        await project.save();

        //save the project to the invited user's project invites list.
        for(let user of assignedList){
            let assignedUser = await Users.findById(user);
            assignedUser.tasks = assignedUser.tasks.concat(savedTask._id);
            await assignedUser.save();
        }
        //return saved task
        response.json(savedTask);
    } else{
        //else return user is not authorized to create task.
        response.status(401).json({error: 'user is not authorized to create task'});
    }
});

//PUT
taskRouter.put("/:id", async(request, response) => {
    //find the task to Update with id from request.params.id
    const taskToUpdate = await Tasks.findById(request.params.id);

    //get token from request called to check if the header contains bearer. Then take off bearer and return token.
    const token = getTokenFrom(request);
    //decode the token into the user object which will contain username and id.
    const decodedToken = jwt.verify(token, process.env.SECRET);
    //if decode not successful, token is not valid.
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }
    //if token is valid, get user and the current project.
    const user = await Users.findById(decodedToken.id);
    const project = await Projects.findById(taskToUpdate.project);

    //check user role: user must be admin or owner to create task.
    const isUserCreator = String(project.creator) === String(user._id)? true: false;
    const isUserAdmin = project.admins.includes(user._id)? true: false;

    if(isUserCreator || isUserAdmin){
        //check the basics data of task to update, if there is any basic data from incoming request update.
        taskToUpdate.name = request.body.name? request.body.name : taskToUpdate.name;
        taskToUpdate.description = request.body.description? request.body.description : taskToUpdate.description;
        taskToUpdate.endDate = request.body.endDate? request.body.endDate : taskToUpdate.endDate;

        //if there are any assigned - linking data, update the assigned list in the task along with updating the tasks of the users to include the current task.
        if(request.body.assigned){
            //first unique checks if there are any task in existing array that is not in new array. Second vise versa. 
            let unique = []
            const oldArray = taskToUpdate.assigned.map((user) => String(user));
            const newArray = request.body.assigned.map((user) => String(user));
            for(let user of oldArray){
                if(!newArray.includes(user)){
                    unique = unique.concat(user);
                }
            }
            for(let user of newArray){
                if(!oldArray.includes(user)){
                    unique = unique.concat(user);
                }
            }
            for(let userId of unique){
                const userToUpdate = await Users.findById(userId);

                if(userToUpdate.tasks.includes(taskToUpdate.id)) {                
                        userToUpdate.tasks = userToUpdate.tasks.filter((task) => String(task) !== String(taskToUpdate._id));
                        taskToUpdate.assigned = taskToUpdate.assigned.filter((user) => String(user) !== String(userToUpdate._id));
                        await userToUpdate.save();
                } else {
                        userToUpdate.tasks = userToUpdate.tasks.concat(taskToUpdate.id);
                        taskToUpdate.assigned = taskToUpdate.assigned.concat(userToUpdate.id);
                        await userToUpdate.save();
                }
            };
        }
    } else{
        if(request.body.name || request.body.description || request.body.endDate || request.body.assigned){
            //else return user is not authorized to create task.
            response.status(401).json({error: 'user is not authorized this update method'});
        }
    }

    taskToUpdate.status = request.body.status? request.body.status: taskToUpdate.status;
    if(request.body){
        console.log("Status", request.body);
    }
    const savedTask = await taskToUpdate.save();
    response.json(savedTask);
})

//DELETE
//first get the task from link id, then get the project from the task.project. 
//filter the tasks from project to remove the current task from the list, then saved the project. 
//remove the task and then return the removedTask information.
taskRouter.delete("/:id", async (request, response) => {
    console.log("Request Params Id", request.params.id);
    const taskToDelete = await Tasks.findById(request.params.id);
    
    //get token from request called to check if the header contains bearer. Then take off bearer and return token.
    const token = getTokenFrom(request);
    console.log("got here 1");
    //decode the token into the user object which will contain username and id.
    const decodedToken = jwt.verify(token, process.env.SECRET);
    //if decode not successful, token is not valid.
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }
    //if token is valid, get user and the current project.
    const user = await Users.findById(decodedToken.id);
    const project = await Projects.findById(taskToDelete.project);

    //check user role: user must be admin or owner to create task.
    const isUserCreator = String(project.creator) === String(user._id)? true: false;
    const isUserAdmin = project.admins.includes(user._id)? true: false;
    
    console.log("got here 2");

    if(isUserCreator || isUserAdmin){
        console.log("got here 3");
        project.tasks = await project.tasks.filter((taskElement) => 
            String(taskElement) !== String(taskToDelete._id)
        )
        await project.save();

        console.log("got here 4");
        const userList = taskToDelete.assigned.map((user) => user);
        for (let user of userList){
            const userToUpdate = await Users.findById(user);
            userToUpdate.tasks = userToUpdate.tasks.filter((task) => task != taskToDelete.id);
            await userToUpdate.save();
        }
        const removedTask = await taskToDelete.remove();

        response.json(removedTask);
    } else{
        //else return user is not authorized to create task.
        response.status(401).json({error: 'user is not authorized to delete task'});
    }
})

module.exports = taskRouter;