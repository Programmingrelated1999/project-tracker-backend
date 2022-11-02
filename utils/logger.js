//normal console.log()
const info = (...params) => {
    console.log(...params);
};
  
//error logging
const error = (...params) => {
    console.error(...params);
};
  
module.exports = {
    info,
    error,
};