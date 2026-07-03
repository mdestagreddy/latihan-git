const mysql = require("mysql")

const connectionPool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "db_movie"
})
connectionPool.getConnection(err => {
    if (err) throw err;
})

module.exports = {
    connectionPool
}