const router = require('./routes');
const { verifyToken } = require('../middleware/auth');
const { UserModel } = require('./models');

module.exports = {
  router,
  verifyToken,
  UserModel
};
