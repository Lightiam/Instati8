const router = require('./routes');
const { setupWebSockets } = require('./websocket');
const { DatabaseModel, redis, redisSub } = require('./models');
const { checkAccessRules, setSecurityRules, getSecurityRules } = require('./security');

module.exports = {
  router,
  setupWebSockets,
  DatabaseModel,
  redis,
  redisSub,
  checkAccessRules,
  setSecurityRules,
  getSecurityRules
};
