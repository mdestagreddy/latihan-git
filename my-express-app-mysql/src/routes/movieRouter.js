const express = require('express')
const movieRouter = express.Router()
const { timingMiddleware, loggerMiddleware, authentication } = require('../middleware')

const {
    getMovies,
    
    createMovie,
    updateMovie,
    deleteMovie,
    readMovies,
} = require("../controllers/movieController");

// GET
movieRouter.use(loggerMiddleware, timingMiddleware);
movieRouter.get('/search', getMovies)
movieRouter.get('/search/:id', getMovies)
movieRouter.get('/api/get', authentication, readMovies)
movieRouter.get('/api/get/:id', authentication, readMovies)

// POST
movieRouter.post('/api/post', authentication, createMovie)
movieRouter.post('/api/update', authentication, updateMovie)
movieRouter.post('/api/delete', authentication, deleteMovie)

// PUT
movieRouter.put('/api/update', authentication, updateMovie)

// DELETE
movieRouter.delete('/api/delete', authentication, deleteMovie)

module.exports = { movieRouter }