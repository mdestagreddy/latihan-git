const express = require('express')
const movieRouter = express.Router()

const {
    getMovies,
    getMoviesAPI,
    updateToken,
    getJSONMovies,
    getToken,

    timingMiddleware,
    loggerMiddleware,
    tokenMiddleware
} = require("../controllers/movieController")

movieRouter.use(timingMiddleware);
movieRouter.get('/movies', getMovies)
movieRouter.get('/movies/:keyword', getMovies)
movieRouter.get('/api/movies', loggerMiddleware, tokenMiddleware, getMoviesAPI)
movieRouter.get('/api/movies/:keyword', loggerMiddleware, tokenMiddleware, getMoviesAPI)

module.exports = { movieRouter, getJSONMovies, updateToken, getToken }