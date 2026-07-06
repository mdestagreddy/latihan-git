const { createMovie, updateMovie, deleteMovie, readMovies } = require("../config/database")

const localhostPort = process.env.PORT;

const { WebSocketServer } = require('ws')

const wss = new WebSocketServer({ port: localhostPort + 1 });
let ws = null;

let movies = null;
let tokenAPI = null;
let tokenTimeout = null;

const BASE_URL = `http://localhost:${localhostPort}`;

const updateToken = () => {
    let result = "";
    let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.round(Math.random() * chars.length));
    }

    tokenAPI = result;
    if (ws) {
        ws.send(JSON.stringify({ type: "token", token: tokenAPI }));
    }

    if (tokenTimeout) clearTimeout(tokenTimeout);
    tokenTimeout = setTimeout(() => {
        updateToken();
    }, 30000);
}

const getToken = (update = false) => {
    if (update) updateToken();
    return tokenAPI;
}

function getObjectMoviesByQuery(query, targetQuery) {
    if (!movies) {
        return { result: { success: false, code: 404, error: "Data tidak tersedia." } };
    }

    let filtered = [...movies];
    let keys = Object.keys(query);
    let queryDetected;

    if (keys.length === 0 || keys.every(k => !query[k])) {
        return { result: { items: filtered, success: true, code: 200, queryDetected }, queryDetected: "all" };
    }

    for (let q in query) {
        if (q != "token" && q != "devMode") {
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
            result: { success: false, code: 404, error: `Data tidak ditemukan untuk pencarian ${queryDetected}: ${query[queryDetected]}`, queryDetected, queryValue: query[queryDetected] },
            queryDetected
        };
    }

    return { result: { items: filtered, success: true, code: 200, queryDetected, queryValue: query[queryDetected] }, queryDetected };
}

const getMoviesAPI = async (req, res) => {
    try {
        let response = await fetch(`${BASE_URL}/api/all_movies?token=${tokenAPI}`);
        movies = await response.json()
        movies = movies.items;

        let objectMovies = getObjectMoviesByQuery(Object.keys(req.params).length != 0 ? req.params : req.query, {keyword: "title"})
        res.status(objectMovies.result.code).json(objectMovies.result)
    } catch (err) {
        res.status(err.code).json(err);
    }
}

const getMovies = async (req, res) => {
    let result = "";
    const queryString = new URLSearchParams(Object.keys(req.params).length != 0 ? req.params : req.query).toString();
    
    try {
        let response = await fetch(`${BASE_URL}/api/movies?token=${tokenAPI}&${queryString}`);
        let json = await response.json();

        if (json.items) {
            json.items.forEach(function(item, index) {
                result += `
                    <div style="display: flex; align-items: center; gap: 8px">
                        <b style="font-size: 32px; width: 48px; text-align: center; flex-shrink: 0">${item.id}.</b>
                        <div style="display: flex; flex-direction: column">
                            <div style="font-size: 24px">${item.title} (${item.year})</div>
                        </div>
                    </div>
                `;
            })

            result = `
                <h1>Hasil dari ${json.queryDetected}: ${json.queryValue} (${json.items.length} film ditemukan)  </h1>
                <div style="display: flex; flex-direction: column; gap: 8px">
                    ${result}
                </div>
            `
        } else {
            result += `<span style="color: red; font-size: 20px">${json.message}</span>`;
        }

        res.status(response.status).send(result);
    } catch (err) {
        result += `Error: ${err.message}`;
        res.status(err.status || 400).send(result);
    }
}

const timingMiddleware = (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationInMs = (duration[0] * 1000 + duration[1] / 1e6).toFixed(2);
        console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${durationInMs} ms)`);
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    next();
}

const loggerMiddleware = (req, res, next) => {
    console.log(`Method: ${req.method}`)
    console.log(`URL: ${req.url}`)
    console.log("Time: ", new Date())
    next()
}

const tokenMiddleware = (req, res, next) => {
    let token = req.body?.token || req.query?.token;
    if (token == tokenAPI || req.query.devMode == "true") {
        next()
    } else {
        res.status(401).json({
            message: "Token tidak valid",
            success: false,
            code: 401
        })
    }
}

wss.on("connection", _ws => {
    console.log(`Client WebSocket terhubung`);
    ws = _ws;
    ws.send(JSON.stringify({ type: "token", token: tokenAPI }));

    ws.on("message", data => {
        let res = JSON.parse(data.toString());
        if (res.action == "updateToken") {
            updateToken();
        }
    })
});

updateToken();

module.exports = {
    getMovies,
    getMoviesAPI,
    updateToken,
    getToken,
    localhostPort,
    
    createMovie,
    updateMovie,
    deleteMovie,
    readMovies,

    timingMiddleware,
    loggerMiddleware,
    tokenMiddleware
}       