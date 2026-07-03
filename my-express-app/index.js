const express = require('express')
const app = express()
const port = 3000

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${port}`;

let movies = null;

async function getJSONMovies() {
    try {
        let responseMovies = await fetch("https://chemitcpanel.cpaneldev.princeton.edu/movies.json", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
        });

        const contentType = responseMovies.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Response is not JSON");
        }

        movies = await responseMovies.json();
    } catch (error) {
        movies = [
            {id: 1, title: "Spider-Man", year: 2002},
            {id: 2, title: "John Wick", year: 2014},
            {id: 3, title: "The Avengers", year: 2012},
            {id: 4, title: "Logan", year: 2017},
        ]
    }
}

function getObjectMoviesByQuery(query, targetQuery) {
    if (!movies) {
        return { result: { success: false, code: 404, error: "Data tidak tersedia." } };
    }

    let filtered = [...movies];
    let keys = Object.keys(query);
    let queryDetected;

    if (keys.length === 0 || keys.every(k => !query[k])) {
        return { result: { items: filtered, success: true, code: 200 }, queryDetected: "all" };
    }

    for (let q in query) {
        if (q != "token") {
            let currentKey = q;
            queryDetected = q;
            if (targetQuery && targetQuery[q]) {
                currentKey = targetQuery[q];
            }
            
            if (query[q]) {
                if (Number(query[q])) {
                    filtered = filtered.filter(item => item[currentKey] === Number(query[q]));
                } else {
                    filtered = filtered.filter(item => new RegExp(query[q], "i").test(item[currentKey]));
                }
            }
        }
    }

    if (filtered.length === 0) {
        return {
            result: { success: false, code: 404, error: `Data tidak ditemukan untuk pencarian ${queryDetected}: ${query[queryDetected]}` },
            queryDetected
        };
    }

    return { result: { items: filtered, success: true, code: 200 }, queryDetected };
}

const getMoviesAPI = (req, res) => {
    let objectMovies = getObjectMoviesByQuery(Object.keys(req.params).length != 0 ? req.params : req.query, {title: "originalTitle", year: "startYear"})
    res.status(objectMovies.result.code).json(objectMovies.result)
}

const getMovies = async (req, res) => {
    let result = "";
    const queryString = new URLSearchParams(Object.keys(req.params).length != 0 ? req.params : req.query).toString();
    
    try {
        let response = await fetch(`${BASE_URL}/movies_api?token=admin&${queryString}`);
        let json = await response.json();

        if (json.items) {
            json.items.forEach(function(item, index) {
                result += `<span style="font-size: 24px"><b>${index + 1}.</b> ${item.title || item.originalTitle} (${item.year || item.startYear})<br></span>`
            })
        } else {
            result += `<span style="color: red; font-size: 20px">${json.error}</span>`;
        }

        res.status(response.status).send(result);
    } catch (err) {
        result += `Error: ${err.message}`;
        res.status(err.status).send(result);
    }
}

app.get('/', (req, res) => {
    res.send(`Homepage by mdestagreddy<br><br>
        <form action="/movies">Search Movies: <input name="title" type="search" /><input type="submit" value="Search" /></form>
        <form action="/movies_api">Search Movies (JSON): <input name="title" type="search" /><input type="submit" value="Search" /><input type="hidden" name="token" value="admin" /></form>`)
})

const timingMiddleware = (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationInMs = (duration[0] * 1000 + duration[1] / 1e6).toFixed(2);

        console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${durationInMs} ms)`);
    });

    next();
}

const loggerMiddleware = (req, res, next) => {
    console.log(`Method: ${req.method}`)
    console.log(`URL: ${req.url}`)
    next()
}

const tokenMiddleware = (req, res, next) => {
    let { token } = req.query;

    if (token == "admin") {
        next()
    } else {
        res.status(401).json({
            error: "Token tidak valid",
            success: false,
            code: 401
        })
    }
}

app.use(timingMiddleware);
app.get('/movies', getMovies)
app.get('/movies/:year', getMovies)
app.get('/movies_api', loggerMiddleware, tokenMiddleware, getMoviesAPI)
app.get('/movies_api/:year', loggerMiddleware, tokenMiddleware, getMoviesAPI)

async function startServer() {
    await getJSONMovies();
    app.listen(port, () => {
        console.log(`App listening on port http://localhost:${port}`)
    })
}

startServer();