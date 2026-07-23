const { connectionPool } = require("../config/database")

const createMovie = (req, res) => {
    let {title, year} = req.body;
    let queryText = `INSERT INTO movies (title, year) VALUES ('${title}', ${year})`;
    connectionPool.query(queryText, err => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal membuat data: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(201).json({
            success: true,
            message: "Data berhasil dibuat",
            code: 201
        });
    });
}

const updateMovie = (req, res) => {
    let {id, title, year} = req.body;
    let queryText = `UPDATE movies SET title='${title}', year=${year} WHERE id=${id}`;

    connectionPool.query(queryText, err => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal memperbarui data: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Data berhasil diperbarui",
            code: 200
        });
    })
}

const deleteMovie = (req, res) => {
    let {id} = req.body;
    let queryText = `DELETE FROM movies WHERE id=${id}`;
    if (id == "") {
        res.status(400).json({
            success: false,
            message: "Silahkan isi ID terlebih dahulu",
            code: 400
        });
        return;
    }
    connectionPool.query(queryText, err => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal menghapus data: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Data berhasil dihapus",
            code: 200
        });
    })
}

const buildMovieQuery = (query = {}, targetQuery = {}) => {
    const conditions = [];
    const values = [];
    let queryDetected;
    let queryValue;

    Object.entries(query || {}).forEach(([key, rawValue]) => {
        if (rawValue === undefined || rawValue === null || rawValue === "") {
            return;
        }

        const column = targetQuery[key] || key;
        queryDetected = key;
        queryValue = rawValue;

        if ((column === "id" || column === "year") && !Number.isNaN(Number(rawValue))) {
            conditions.push(`${column} = ?`);
            values.push(Number(rawValue));
        } else {
            conditions.push(`${column} LIKE ?`);
            values.push(`%${rawValue}%`);
        }
    });

    return { conditions, values, queryDetected, queryValue };
};

const readMovies = (req, res) => {
    const queryInput = Object.keys(req.params || {}).length !== 0 ? { ...req.query, ...req.params } : req.query || {};
    const { conditions, values, queryDetected, queryValue } = buildMovieQuery(queryInput, { keyword: "title" });

    let queryText = "SELECT * FROM db_movies2.movies";
    if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(" AND ")}`;
    }

    connectionPool.query(queryText, values, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal mendapatkan data: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        if (data.length === 0) {
            res.status(404).json({
                success: false,
                code: 404,
                error: `Data tidak ditemukan untuk pencarian ${queryDetected || "all"}: ${queryValue || ""}`,
                queryDetected: queryDetected || "all",
                queryValue
            });

            return;
        }

        res.status(200).json({
            items: data,
            success: true,
            code: 200,
            queryDetected: queryDetected || "all",
            queryValue
        });
    });
}

module.exports = {
    createMovie,
    updateMovie,
    deleteMovie,
    readMovies,
}       