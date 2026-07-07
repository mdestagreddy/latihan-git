const express = require('express')
const userRouter = express.Router()
const {login, register} = require('../controllers/userController')
const { timingMiddleware, loggerMiddleware, tokenMiddleware } = require('../controllers/runner')

userRouter.use(timingMiddleware, loggerMiddleware, tokenMiddleware);
userRouter.post('/api/login', login)
userRouter.post('/api/register', register)
// userRouter.get('/login', loginPage)
// userRouter.get('/register', registerPage)

module.exports = userRouter;