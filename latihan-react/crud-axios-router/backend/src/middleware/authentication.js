const jwt = require('jsonwebtoken')

const authentication = (req, res, next) => {
    const schemeName = 'Bearer';
    const authHeader = req.header('Authorization');

    const sendUnauthorized = (message = 'User tidak diautentikasi') => {
        res.setHeader('WWW-Authenticate', schemeName);
        return res.status(401).json({
            success: false,
            message,
            code: 401
        });
    };

    if (!authHeader) {
        return sendUnauthorized('Anda belum login');
    }

    const tokenSplit = authHeader.split(' ');
    let scheme = schemeName;
    let token = null;
    if (tokenSplit.length >= 2) {
        [scheme, token] = tokenSplit;
    } else token = tokenSplit[0];

    if (scheme !== schemeName || !token) {
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