//get the project, and userId checks if the user is the project admin
const isUserAdmin = (project, userId) => {
    if(project.admins.includes(userId)){
        return true;
    }
    return false;
}

//get the project, and userId checks if the user is the project creator
const isUserCreator = (project, userId) => {
    if(String(project.creator) === String(userId)){
        return true;
    }
    return false;
}

//get the project, and userId checks if the user is the project developer
const isUserDeveloper = (project, userId) => {
    if(project.developers.includes(userId)){
        return true;
    }
    return false;
}

//get the project, and userId checks if the user is the project client
const isUserClient = (project, userId) => {
    if(project.clients.includes(userId)){
        return true;
    }
    return false;
}

//get the project, and userId checks if the user is in project invite list
const isUserInvited = (project, userId) => {
    if(project.invites.includes(userId)){
        return true;
    }
    return false;
}


//check if the removedUserList contains admin
const containsAdmin = (removedUsersList, adminList) => {
    for(let removedUser of removedUsersList){
        if(adminList.includes(removedUser)){
            return true;
        }
    }
    return false;
}

//check if the removedUserList contains Creator
const containsCreator = (removedUsersList, creatorId) => {
    if(removedUsersList.includes(creatorId)){
        return true;
    }
    return false;
}

//exports
module.exports = {isUserAdmin, isUserCreator, isUserDeveloper, isUserClient, isUserInvited, containsAdmin, containsCreator};