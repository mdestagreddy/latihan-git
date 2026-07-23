const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {connectionPool} = require('../config/database')

const userCheck = (email, password) => {
    return new Promise((resolve, reject) => {
        const queryText = 'SELECT * FROM db_movies2.user WHERE email = ?';

        connectionPool.query(queryText, [email], (err, data) => {
            if (err) {
                console.error(err);
                reject(err);

                return;
            }

            const user = data[0];
            const output = (success) => {
                resolve({ success, data: user })
            }

            if (!Array.isArray(data) || data.length === 0) return output(false);
            if (!password) return output(true);

            bcrypt.compare(password, user.pass)
                .then(output)
                .catch(err => {
                    console.error(err);
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

    const check = await userCheck(email, password);
    if (check.success) {
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
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({
            success: false,
            message: "Silahkan isi email dan password terlebih dahulu",
            code: 400
        });

        return;
    }

    const check = await userCheck(email, password);

    if (check.success) {
        const accessToken = jwt.sign({ email: check.data.email, name: check.data.name }, process.env.JWT_SECRET)
        res.status(200).json({
            success: true,
            accessToken,
            code: 200
        });
    } else {
        res.status(401).json({
            success: false,
            message: "User tidak valid",
            code: 401
        });
    }
}

module.exports = {
    register,
    login
}