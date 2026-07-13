const timingMiddleware = require('./timingMiddleware');
const loggerMiddleware = require('./loggerMiddleware');
const authentication = require('./authentication');

module.exports = {
    timingMiddleware,
    loggerMiddleware,
    authentication
};
