const { connectionPool } = require("../config/database")

const createCategory = (req, res) => {
    let { name, description, items } = req.body;
    let queryText = "";
    if (items) {
        queryText += "INSERT INTO category (category_name, category_desc) VALUES ";
        items.forEach((item, index) => {
            queryText += `('${item.name}', '${item.description}')${index < items.length - 1 ? ", " : ";"}`;
        });
    } else queryText = `INSERT INTO category (category_name, category_desc) VALUES ('${name}', '${description}')`;
    connectionPool.query(queryText, err => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal membuat kategori: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(201).json({
            success: true,
            message: "Kategori berhasil dibuat",
            code: 201
        });
    });
}

const updateCategory = (req, res) => {
    let { id, name, description } = req.body;
    let queryText = `UPDATE category SET category_name='${name}', category_desc='${description}' WHERE id=${id}`;

    connectionPool.query(queryText, err => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal memperbarui kategori: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Kategori berhasil diperbarui",
            code: 200
        });
    })
}

const deleteCategory = (req, res) => {
    let { id } = req.body;
    let queryText = `DELETE FROM category WHERE id=${id}`;
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
                message: `Gagal menghapus kategori: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(200).json({
            success: true,
            message: "Kategori berhasil dihapus",
            code: 200
        });
    })
}

const buildCategoryQuery = (query = {}, targetQuery = {}) => {
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

const readCategory = (req, res) => {
    const queryInput = Object.keys(req.params || {}).length !== 0 ? { ...req.query, ...req.params } : req.query || {};
    const { conditions, values, queryDetected, queryValue } = buildCategoryQuery(queryInput, { keyword: "title" });

    let queryText = "SELECT * FROM db_movies2.category";
    if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(" AND ")}`;
    }

    connectionPool.query(queryText, values, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal mendapatkan kategori: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        if (data.length === 0) {
            res.status(404).json({
                success: false,
                code: 404,
                error: `Kategori tidak ditemukan untuk pencarian ${queryDetected || "all"}: ${queryValue || ""}`,
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
    createCategory,
    updateCategory,
    deleteCategory,
    readCategory,
}       