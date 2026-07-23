const express = require('express')
const categoryRouter = express.Router()
const { timingMiddleware, loggerMiddleware, authentication } = require('../middleware')

const {
    createCategory,
    updateCategory,
    deleteCategory,
    readCategory,
} = require("../controllers/categoryController");

// GET
categoryRouter.use(loggerMiddleware, timingMiddleware);
categoryRouter.get('/api/get', readCategory)
categoryRouter.get('/api/get/:id', readCategory)

// POST
categoryRouter.post('/api/new', createCategory)
categoryRouter.post('/api/update', updateCategory)
categoryRouter.post('/api/delete', deleteCategory)

// PUT
categoryRouter.put('/api/update', updateCategory)

// DELETE
categoryRouter.delete('/api/delete', deleteCategory)

module.exports = categoryRouter