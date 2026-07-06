const express = require('express')
const movieRouter = express.Router()

const {
    getMovies,
    getMoviesAPI,
    updateToken,
    getToken,
    localhostPort,

    createMovie,
    updateMovie,
    deleteMovie,
    readMovies,

    timingMiddleware,
    loggerMiddleware,
    tokenMiddleware
} = require("../controllers/movieController");

movieRouter.use(express.json());
movieRouter.use(express.urlencoded({ extended: true }));

// GET
movieRouter.use(loggerMiddleware, timingMiddleware);
movieRouter.get('/api/all_movies', tokenMiddleware, readMovies)
movieRouter.get('/movies', getMovies)
movieRouter.get('/movies/:id', getMovies)
movieRouter.get('/api/movies', tokenMiddleware, getMoviesAPI)
movieRouter.get('/api/movies/:id', tokenMiddleware, getMoviesAPI)

movieRouter.get('/api/token', (req, res) => {
    res.send(getToken());
});

// POST
movieRouter.post('/api/post_movie', tokenMiddleware, createMovie)
movieRouter.post('/api/update_movie', tokenMiddleware, updateMovie)
movieRouter.post('/api/delete_movie', tokenMiddleware, deleteMovie)

// PUT
movieRouter.put('/api/update_movie', tokenMiddleware, updateMovie)

// DELETE
movieRouter.delete('/api/delete_movie', tokenMiddleware, deleteMovie)

module.exports = { movieRouter, updateToken, getToken, localhostPort }