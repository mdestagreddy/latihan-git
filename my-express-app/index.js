const express = require('express')
const app = express()
const port = 3000

const { movieRouter, getJSONMovies, updateToken, getToken } = require("./src/routes/movieRouter")

app.use('/', movieRouter)

app.get('/', (req, res) => {  
    updateToken();
    res.send(`Homepage by mdestagreddy<br><br>
        <form action="/movies">Cari film berdasarkan kata kunci: <input name="keyword" type="search" /><input type="submit" value="Cari" /></form>
        <form action="/api/movies">Cari film melalui JSON: <input name="keyword" type="search" /><input type="submit" value="Cari" /><input type="hidden" name="token" value="${getToken()}" /></form>`)
})

async function startServer() {
    await getJSONMovies();
    app.listen(port, () => {
        console.log(`App listening on port http://localhost:${port}`)
    })
}

startServer()