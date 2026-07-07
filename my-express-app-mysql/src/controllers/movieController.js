const { connectionPool, createMovie, updateMovie, deleteMovie, readMovies } = require("../config/database")

const localhostPort = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${localhostPort}`;

function buildMovieQuery(query, targetQuery = {}) {
    const conditions = [];
    const values = [];
    let queryDetected;
    let queryValue;

    Object.keys(query || {}).forEach((q) => {
        const rawValue = query[q];
        if (rawValue === undefined || rawValue === null || rawValue === "") {
            return;
        }

        const column = targetQuery[q] || q;
        queryDetected = q;
        queryValue = rawValue;

        if (["id", "year"].includes(column) && !Number.isNaN(Number(rawValue))) {
            conditions.push(`${column} = ?`);
            values.push(Number(rawValue));
        } else {
            conditions.push(`${column} LIKE ?`);
            values.push(`%${rawValue}%`);
        }
    });

    return { conditions, values, queryDetected, queryValue };
}

const getMovies = async (req, res) => {
    let result = "";
    const queryString = new URLSearchParams(Object.keys(req.params).length != 0 ? req.params : req.query).toString();
    const authHeader = req.headers.authorization;
    const headers = authHeader ? { Authorization: authHeader } : {};
    
    try {
        let response = await fetch(`${BASE_URL}/movie/api/get${queryString ? `?${queryString}` : ''}`, {
            headers,
        });
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

module.exports = {
    getMovies,
    localhostPort,
    
    createMovie,
    updateMovie,
    deleteMovie,
    readMovies,
}       