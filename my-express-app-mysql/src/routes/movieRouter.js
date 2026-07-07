const express = require('express')
const movieRouter = express.Router()
const { timingMiddleware, loggerMiddleware, tokenMiddleware, updateToken, getToken } = require('../controllers/runner')

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
movieRouter.get('/api/get', tokenMiddleware, readMovies)
movieRouter.get('/api/get/:id', tokenMiddleware, readMovies)

// POST
movieRouter.post('/api/post', tokenMiddleware, createMovie)
movieRouter.post('/api/update', tokenMiddleware, updateMovie)
movieRouter.post('/api/delete', tokenMiddleware, deleteMovie)

// PUT
movieRouter.put('/api/update', tokenMiddleware, updateMovie)

// DELETE
movieRouter.delete('/api/delete', tokenMiddleware, deleteMovie)

module.exports = { movieRouter, updateToken, getToken }