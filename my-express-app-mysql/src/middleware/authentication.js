const jwt = require('jsonwebtoken')

const authentication = (req, res, next) => {
    const authHeader = req.header('Authorization');

    const sendUnauthorized = (message = 'User tidak diautentikasi') => {
        res.setHeader('WWW-Authenticate', 'Bearer');
        return res.status(401).json({
            success: false,
            message,
            code: 401
        });
    };

    if (!authHeader) {
        return sendUnauthorized('Anda belum login');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return sendUnauthorized('Format token tidak valid');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return sendUnauthorized('Token tidak valid');
        }

        req.user = decoded;
        next();
    });
};

module.exports = authentication