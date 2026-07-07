const express = require('express')
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

app.get('/', (req, res) => {  
    res.send(`
        <b>Homepage by mdestagreddy</b>
        <br><br>
        <form action="/movie/search">
            Cari film berdasarkan kata kunci: <input name="keyword" type="search" />
            <input type="submit" value="Cari" />
        </form>
        <form action="/movie/search">
            Cari film berdasarkan id: <input name="id" type="number" />
            <input type="submit" value="Cari ID" />
        </form>
        <form action="/movie/api/get">
            Cari film melalui JSON: <input name="keyword" type="search" />
            <input type="submit" value="Cari" />
        </form>
        <br>
        <b>Buat film</b><br>
        <form action="/movie/api/post" method="POST">
            Judul: <input name="title" type="text" /><br>
            Tahun: <input name="year" type="number" /><br>
            <input type="submit" value="Buat" />
        </form>
        <br>
        <b>Update film</b><br>
        <form action="/movie/api/update" method="POST">
            ID: <input name="id" type="number" /><br>
            Judul: <input name="title" type="text" /><br>
            Tahun: <input name="year" type="number" /><br>
            <input type="submit" value="Perbarui" />
        </form>
        <b>Hapus film</b><br>
        <form action="/movie/api/delete" method="POST">
            ID: <input name="id" type="number" /><br>
            <input type="submit" value="Hapus" />
        </form>

    `)
})

async function startServer() {
    const server = http.createServer(app)

    server.listen(localhostPort, () => {
        console.log(`App listening on port http://localhost:${localhostPort}`)
    })
}

startServer()