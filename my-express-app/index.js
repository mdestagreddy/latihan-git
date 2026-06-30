const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Halo, nama saya Muhammad Desta Greddy Aulia Rahman')
})

app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})