const express = require('express')
const app = express()
const port = 3000

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${port}`;

app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})