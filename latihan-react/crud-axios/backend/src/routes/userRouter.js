const express = require('express')
const userRouter = express.Router()
const { login, register } = require('../controllers/userController')
const { timingMiddleware, loggerMiddleware, authentication } = require('../middleware')

userRouter.use(timingMiddleware, loggerMiddleware);

userRouter.post('/api/login', login)
userRouter.post('/api/register', register)

userRouter.use(authentication);

module.exports = userRouter;