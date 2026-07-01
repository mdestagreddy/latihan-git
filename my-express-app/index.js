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
        return { result: { success: false, error: "Data tidak tersedia." } };
    }

    let filtered = [...movies];
    let keys = Object.keys(query);

    if (keys.length === 0 || keys.every(k => !query[k])) {
        return { result: { items: filtered, success: true }, queryDetected: "all" };
    }

    let queryDetected = keys[0];

    for (let q in query) {
        let currentKey = q;
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

    if (filtered.length === 0) {
        return {
            result: { success: false, error: `Data tidak ditemukan untuk pencarian ${queryDetected}: ${query[queryDetected]}` },
            queryDetected
        };
    }

    return { result: { items: filtered, success: true }, queryDetected };
}

const getJSONMoviesAPI = (req, res) => {
    let objectMovies = getObjectMoviesByQuery(req.query, {title: "originalTitle", year: "startYear"})
    res.json(objectMovies.result)
}

const getMovies = async (req, res) => {
    let result = "";
    const queryString = new URLSearchParams(req.query).toString();
    
    try {
        let response = await fetch(`${BASE_URL}/object_movies?${queryString}`);
        let json = await response.json();

        if (json.items) {
            json.items.forEach(function(item, index) {
                result += `<span style="font-size: 24px"><b>${index + 1}.</b> ${item.title || item.originalTitle} (${item.year || item.startYear})<br></span>`
            })
        } else {
            result += `<span style="color: red; font-size: 20px">${json.error}</span>`;
        }
    } catch (err) {
        result += `Error: ${err.message}`;
    }
    
    res.send(result)
}

app.get('/', (req, res) => {
    res.send(`Homepage by mdestagreddy<br><br>
        <form action="/movies">Search Movies: <input name="title" type="search" /><input type="submit" value="Search" /></form>
        <form action="/movies_api">Search Movies (JSON): <input name="title" type="search" /><input type="submit" value="Search" /></form>`)
})

app.get('/movies', getMovies)
app.get('/movies_api', getJSONMoviesAPI)

async function startServer() {
    await getJSONMovies();
    app.listen(port, () => {
        console.log(`App listening on port http://localhost:${port}`)
    })
}

startServer();