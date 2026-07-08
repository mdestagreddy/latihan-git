const express = require('express')
const swaggerUi = require('swagger-ui-express')
const swaggerFile = require('./swagger-output.json')
const path = require('path')
const cors = require('cors')
const http = require('http')
const dotenv = require('dotenv')
const app = express()

dotenv.config()

const localhostPort = Number(process.env.PORT) || 3000;
const { movieRouter } = require('./src/routes/movieRouter')
const userRouter = require('./src/routes/userRouter')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: `http://localhost:${localhostPort}`,
    optionsSuccessStatus: 200
}))
app.use('/movie', movieRouter)
app.use('/user', userRouter)

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
})
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

async function startServer() {
    const server = http.createServer(app)

    server.listen(localhostPort, () => {
        console.log(`App listening on port http://localhost:${localhostPort}`)
    })
}

startServer()