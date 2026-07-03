let movies = null;
let tokenAPI = null;
let tokenTimeout = null;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:3000`;

const updateToken = () => {
    let result = "";
    let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.round(Math.random() * chars.length));
    }

    tokenAPI = result;
}

const getToken = () => {
    return tokenAPI;
}

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
        throw new Error("Periksa koneksi jaringan Anda");
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
        return { result: { items: filtered, success: true, code: 200, queryDetected }, queryDetected: "all" };
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
            result: { success: false, code: 404, error: `Data tidak ditemukan untuk pencarian ${queryDetected}: ${query[queryDetected]}`, queryDetected, queryValue: query[queryDetected] },
            queryDetected
        };
    }

    return { result: { items: filtered, success: true, code: 200, queryDetected, queryValue: query[queryDetected] }, queryDetected };
}

const getMoviesAPI = (req, res) => {
    let objectMovies = getObjectMoviesByQuery(Object.keys(req.params).length != 0 ? req.params : req.query, {keyword: "originalTitle", year: "startYear"})
    res.status(objectMovies.result.code).json(objectMovies.result)
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
                        <b style="font-size: 32px; width: 48px; text-align: center; flex-shrink: 0">${index + 1}</b>
                        <img width="128px" style="flex-shrink: 0" src="${item.primaryImage}" />
                        <div style="display: flex; flex-direction: column">
                            <div style="font-size: 24px">${item.title || item.originalTitle} (${item.year || item.startYear})</div>
                            <div style="font-size: 16px">${item.description}</div>
                        </div>
                    </div>
                `
            })

            result = `
                <h1>Hasil dari ${json.queryDetected}: ${json.queryValue} (${json.items.length} film ditemukan)  </h1>
                <div style="display: flex; flex-direction: column; gap: 8px">
                    ${result}
                </div>
            `
        } else {
            result += `<span style="color: red; font-size: 20px">${json.error}</span>`;
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
    let { token } = req.query;

    if (token == tokenAPI) {
        next()
        if (!tokenTimeout) {
            tokenTimeout = setTimeout(() => { updateToken(); tokenTimeout = null; }, 30000);
        }
    } else {
        res.status(401).json({
            error: "Token tidak valid",
            success: false,
            code: 401
        })
    }
}

module.exports = {
    getMovies,
    getMoviesAPI,
    updateToken,
    getToken,
    getJSONMovies,

    timingMiddleware,
    loggerMiddleware,
    tokenMiddleware
}       