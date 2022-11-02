//create bugRouter from express Router module
const bugRouter = require("express").Router();

//require jsonwebtoken
const jwt = require('jsonwebtoken');

//require Modals
const Bugs = require("../models/bugs");
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
bugRouter.get("/", (request, response) => {
    Bugs.find({}).then((bugs) => {
        response.json(bugs);
    });
});

//GET ONE
bugRouter.get("/:id", (request, response) => {
    Bugs.findById(request.params.id).then((bug) => {
        response.json(bug);
    });
});

//POST 
//find project who create the project with project id and then create a bug with name, description from request body, createdDate as current time and project set to project id
//save the bug into MongoDB then with the returned object's id saved it to project's bugs.
//update the project and return newly created bug.
bugRouter.post("/", async (request, response) => {
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

    //check user role: user must be admin or owner to create bug.
    const isUserCreator = String(project.creator) === String(user._id)? true: false;
    const isUserAdmin = project.admins.includes(user._id)? true: false;

    //if user is owner or admin, allow create bug.
    if(isUserCreator || isUserAdmin){
        let bug = new Bugs({
            name: request.body.name,
            createdDate: new Date().toDateString(),
            description: request.body.description,
            project: project.id,
        });

        let assignedList;

        //if there are any users invited from the project, then saved the list of users in the invite list.
        if(request.body.assigned){
            bug.assigned = request.body.assigned;
            assignedList = request.body.assigned;
        }
    
        const savedBug = await bug.save();
        project.bugs = project.bugs.concat(savedBug._id);
        await project.save();

        //save the project to the invited user's project invites list.
        for(let user of assignedList){
            let assignedUser = await Users.findById(user);
            assignedUser.bugs = assignedUser.bugs.concat(savedBug._id);
            await assignedUser.save();
        }
    
        response.json(savedBug);
    } else{
        //else return user is not authorized to create bug.
        response.status(401).json({error: 'user is not authorized to create bug'});
    }
});

//PUT
bugRouter.put("/:id", async(request, response) => {
    //find the bug to Update with id from request.params.id
    const bugToUpdate = await Bugs.findById(request.params.id);

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
    const project = await Projects.findById(bugToUpdate.project);

    //check user role: user must be admin or owner to create task.
    const isUserCreator = String(project.creator) === String(user._id)? true: false;
    const isUserAdmin = project.admins.includes(user._id)? true: false;

    if(isUserCreator || isUserAdmin){
        //check the basics data of bug to update, if there is any basic data from incoming request update.
        bugToUpdate.name = request.body.name? request.body.name : bugToUpdate.name;
        bugToUpdate.description = request.body.description? request.body.description : bugToUpdate.description;
        bugToUpdate.endDate = request.body.endDate? request.body.endDate : bugToUpdate.endDate;

        //if there are any assigned - linking data, update the assigned list in the bug along with updating the bugs of the users to include the current bug.
        if(request.body.assigned){
            //first unique checks if there are any bug in existing array that is not in new array. Second vise versa. 
            let unique = []
            const oldArray = bugToUpdate.assigned.map((user) => String(user));
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

                if(userToUpdate.bugs.includes(bugToUpdate.id)) {                
                        console.log("needs to remove", userToUpdate.name);
                        userToUpdate.bugs = userToUpdate.bugs.filter((bug) => String(bug) !== String(bugToUpdate._id));
                        bugToUpdate.assigned = bugToUpdate.assigned.filter((user) => String(user) !== String(userToUpdate._id));
                        await userToUpdate.save();
                } else {
                        console.log("needs to add", userToUpdate.name);
                        userToUpdate.bugs = userToUpdate.bugs.concat(bugToUpdate.id);
                        bugToUpdate.assigned = bugToUpdate.assigned.concat(userToUpdate.id);
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

    bugToUpdate.status = request.body.status? request.body.status: bugToUpdate.status;
    const savedBug = await bugToUpdate.save();
    response.json(savedBug);
})


//DELETE
//first get the bug from link id, then get the project from the bug.project. 
//filter the bugs from project to remove the current bug from the list, then saved the project. 
//remove the bug and then return the removedBug information.
bugRouter.delete("/:id", async (request, response) => {

    const bugToDelete = await Bugs.findById(request.params.id);
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
    const project = await Projects.findById(bugToDelete.project);

    //check user role: user must be admin or owner to delete bug.
    const isUserCreator = String(project.creator) === String(user._id)? true: false;
    const isUserAdmin = project.admins.includes(user._id)? true: false;

    if(isUserCreator || isUserAdmin){
        project.bugs = await project.bugs.filter((bugElement) => 
            String(bugElement) !== String(bugToDelete._id)
        )
        await project.save();

        const userList = bugToDelete.assigned.map((user) => user);
        for (let user of userList){
            const userToUpdate = await Users.findById(user);
            userToUpdate.bugs = userToUpdate.bugs.filter((bug) => bug != bugToDelete.id);
            await userToUpdate.save();
        }

        const removedBug = await bugToDelete.remove();
        response.json(removedBug);
    } else{
        //else return user is not authorized to create bug.
        response.status(401).json({error: 'user is not authorized to delete bug'});
    }
})

//export
module.exports = bugRouter;