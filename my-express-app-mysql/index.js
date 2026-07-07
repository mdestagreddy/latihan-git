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
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Movie API Dashboard</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 24px;
                    background: linear-gradient(135deg, #f5f7ff, #eef2ff);
                    color: #1f2937;
                }
                .container {
                    max-width: 960px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                    padding: 24px;
                }
                h1 {
                    margin-top: 0;
                    color: #4338ca;
                }
                p {
                    color: #6b7280;
                }
                .grid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                }
                .card {
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 16px;
                    background: #fafafa;
                }
                .card h2 {
                    margin-top: 0;
                    font-size: 18px;
                    color: #374151;
                }
                form {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 10px;
                }
                input {
                    padding: 10px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                }
                button, input[type="submit"] {
                    background: #4338ca;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 12px;
                    cursor: pointer;
                }
                button:hover, input[type="submit"]:hover {
                    background: #3730a3;
                }
                .muted {
                    font-size: 13px;
                    color: #6b7280;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Movie API Dashboard</h1>
                <p>Kelola dan cari data film dengan antarmuka yang lebih rapi.</p>

                <div class="grid">
                    <div class="card">
                        <h2>Cari Film</h2>
                        <form action="/movie/search">
                            <input name="keyword" type="search" placeholder="Kata kunci" />
                            <button type="submit">Cari</button>
                        </form>
                        <form action="/movie/search">
                            <input name="id" type="number" placeholder="ID film" />
                            <button type="submit">Cari ID</button>
                        </form>
                        <form action="/movie/api/get">
                            <input name="keyword" type="search" placeholder="Cari melalui JSON" />
                            <button type="submit">Cari JSON</button>
                        </form>
                    </div>

                    <div class="card">
                        <h2>Buat Film</h2>
                        <form action="/movie/api/post" method="POST">
                            <input name="title" type="text" placeholder="Judul" />
                            <input name="year" type="number" placeholder="Tahun" />
                            <button type="submit">Buat</button>
                        </form>
                    </div>

                    <div class="card">
                        <h2>Update Film</h2>
                        <form action="/movie/api/update" method="POST">
                            <input name="id" type="number" placeholder="ID" />
                            <input name="title" type="text" placeholder="Judul baru" />
                            <input name="year" type="number" placeholder="Tahun baru" />
                            <button type="submit">Perbarui</button>
                        </form>
                    </div>

                    <div class="card">
                        <h2>Hapus Film</h2>
                        <form action="/movie/api/delete" method="POST">
                            <input name="id" type="number" placeholder="ID film" />
                            <button type="submit">Hapus</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `)
})

async function startServer() {
    const server = http.createServer(app)

    server.listen(localhostPort, () => {
        console.log(`App listening on port http://localhost:${localhostPort}`)
    })
}

startServer()