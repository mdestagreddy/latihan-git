const express = require('express')
const userRouter = express.Router()

userRouter.get('/login', loginUser)
userRouter.get('/register', registerUser)

module.exports = userRouter;