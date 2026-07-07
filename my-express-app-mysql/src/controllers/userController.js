const bcrypt = require('bcrypt')
const {connectionPool} = require('../config/database')

const userCheck = (email, name, password) => {
    return new Promise((resolve, reject) => {
        const queryText = 'SELECT * FROM db_movies2.user WHERE email = ? AND name = ?';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
        connectionPool.query(queryText, [email, name], (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).json({
                    success: false,
                    message: `Gagal memeriksa user: [${err.code}] ${err.sqlMessage}`,
                    code: 500
                });  
                reject(err);

                return;
            }
            if (!Array.isArray(data) || data.length === 0) return resolve(false);
            if (!password) return resolve(true);

            const user = data[0];
            bcrypt.compare(password, user.pass)
                .then(resolve)
                .catch(err => {
                    console.error(err);
                    res.status(500).json({
                        success: false,
                        message: `Gagal memeriksa password: ${JSON.stringify(err)}`,
                        code: 500
                    });  
                    reject(err);
                });
        });
    });
}
const register = async (req, res) => {
    const {email, name, password} = req.body;

    if (!email || !name || !password) {
        res.status(400).json({
            success: false,
            message: "Silahkan isi data user terlebih dahulu",
            code: 400
        });

        return;
    }

    const check = await userCheck(email, name);
    if (check) {
        res.status(409).json({
            success: false,
            message: `User Anda sudah terdaftar: ${name}`,
            code: 409
        });

        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const queryRegisterUser = 'INSERT INTO user (email, name, pass) VALUES (?, ?, ?)'

    connectionPool.query(queryRegisterUser, [email, name, hashedPassword], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: `Gagal membuat user: [${err.code}] ${err.sqlMessage}`,
                code: 500
            });

            return;
        }

        res.status(201).json({
            success: true,
            message: "User berhasil dibuat",
            code: 201
        });
    });
}

const login = async (req, res) => {
    const {email, name, password} = req.body;

    if (!email || !name || !password) {
        res.status(400).json({
            success: false,
            message: "Silahkan isi data user terlebih dahulu",
            code: 400
        });

        return;
    }

    const check = await userCheck(email, name, password);

    if (check) {
        res.status(200).json({
            success: true,
            message: "User berhasil login",
            auth: "test",
            code: 200
        });
    } else {
        res.status(401).json({
            success: false,
            message: "Data akun yang Anda dimasukkan salah atau tidak ditemukan",
            code: 401
        });
    }
}

module.exports = {
    register,
    login
}