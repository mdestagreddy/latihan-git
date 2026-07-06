const express = require('express')
const cors = require('cors')
const app = express()

const { movieRouter, updateToken, getToken, localhostPort } = require("./src/routes/movieRouter")

app.use(cors({
    origin: `http://localhost:${localhostPort}`,
    optionsSuccessStatus: 200
}))
app.use('/', movieRouter)

app.get('/', (req, res) => {  
    res.send(`
        <b>Homepage by mdestagreddy </b><button onclick="updateToken()">Update token</button>
        <br><br>
        <form action="/movies">
            Cari film berdasarkan kata kunci: <input name="keyword" type="search" />
            <input type="submit" value="Cari" />
        </form>
        <form action="/movies">
            Cari film berdasarkan id: <input name="id" type="number" />
            <input type="submit" value="Cari ID" />
        </form>
        <form action="/api/movies">
            Cari film melalui JSON: <input name="keyword" type="search" />
            <input type="submit" value="Cari" />
            <input type="hidden" name="token" />
        </form>
        <br>
        <b>Buat film</b><br>
        <form action="/api/post_movie" method="POST">
            Judul: <input name="title" type="text" /><br>
            Tahun: <input name="year" type="number" /><br>
            <input type="submit" value="Buat" />
            <input type="hidden" name="token" />
        </form>
        <br>
        <b>Update film</b><br>
        <form action="/api/update_movie" method="POST">
            ID: <input name="id" type="number" /><br>
            Judul: <input name="title" type="text" /><br>
            Tahun: <input name="year" type="number" /><br>
            <input type="submit" value="Perbarui" />
            <input type="hidden" name="token" />
        </form>
        <b>Hapus film</b><br>
        <form action="/api/delete_movie" method="POST">
            ID: <input name="id" type="number" /><br>
            <input type="submit" value="Hapus" />
            <input type="hidden" name="token" />
        </form>

        <script>
            const socket = new WebSocket("ws://localhost:${localhostPort + 1}");
            socket.onmessage = event => {
                let res = JSON.parse(event.data.toString());
                if (res.type == "token") {
                    document.querySelectorAll("[name=token]").forEach(el => {
                        el.value = res.token;
                    });
                }
            }

            function updateToken() { socket.send(JSON.stringify({action: "updateToken"})); }
        </script>
    `)
})

async function startServer() {
    app.listen(localhostPort, () => {
        console.log(`App listening on port http://localhost:${localhostPort}`)
    })
}

startServer()