const app = require("./app");
const http = require("http");
const logger = require("./utils/logger");
const config = require("./utils/config");

//create a server from the app
const server = http.createServer(app);

//listen on PORT defined in config
server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});