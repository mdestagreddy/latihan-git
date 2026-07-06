const mysql = require("mysql");
require('dotenv').config()

const connectionPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
})
connectionPool.getConnection(err => {
    if (err) throw err;
});

// Database Movie
const createMovie = (req, res) => {
    let {title, year} = req.body;
    let queryText = `INSERT INTO movies (title, year) VALUES ('${title}', ${year})`;
    connectionPool.query(queryText, err => {
        if (err) {
            console.error(err);
            res.status(400).json({
                success: false,
                message: `Gagal membuat data: [${err.code}] ${err.sqlMessage}`,
                code: 400
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
            res.status(400).json({
                success: false,
                message: `Gagal memperbarui data: [${err.code}] ${err.sqlMessage}`,
                code: 400
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
            res.status(400).json({
                success: false,
                message: `Gagal menghapus data: [${err.code}] ${err.sqlMessage}`,
                code: 400
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

const readMovies = (req, res) => {
    let queryText = "SELECT * FROM db_movies2.movies";

    connectionPool.query(queryText, (err, data) => {
        if (err) {
            console.error(err);
            res.status(404).json({
                success: false,
                message: `Gagal mendapatkan data: [${err.code}] ${err.sqlMessage}`,
                code: 404
            });

            return;
        }

        res.status(200).json({
            items: data,
            success: true,
            code: 200
        });
    });
}

// Database User
const bcrypt = require('bcrypt');

const registerUser = (req, res) => {

}

module.exports = {
    connectionPool,

    createMovie,
    updateMovie,
    deleteMovie,
    readMovies
}