const loggerMiddleware = (req, res, next) => {
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log('Time: ', new Date());
    next();
};

module.exports = loggerMiddleware;
