const express = require('express')
const movieRouter = express.Router()
const { timingMiddleware, loggerMiddleware, authentication } = require('../middleware')

const {
    createMovie,
    updateMovie,
    deleteMovie,
    readMovies,
} = require("../controllers/movieController");

// GET
movieRouter.use(loggerMiddleware, timingMiddleware);
movieRouter.get('/api/get', readMovies)
movieRouter.get('/api/get/:id', readMovies)

// POST
movieRouter.post('/api/post', createMovie)
movieRouter.post('/api/update', updateMovie)
movieRouter.post('/api/delete', deleteMovie)

// PUT
movieRouter.put('/api/update', updateMovie)

// DELETE
movieRouter.delete('/api/delete', deleteMovie)

module.exports = { movieRouter }