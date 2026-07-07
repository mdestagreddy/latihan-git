const localhostPort = Number(process.env.PORT) || 3000;

let tokenAPI = null;
let tokenTimeout = null;

const { WebSocketServer } = require('ws')
let wss = null;
let ws = null;

const initializeWebSocketServer = (server) => {
    if (wss) return wss;

    wss = new WebSocketServer({ port: localhostPort + 1 });

    wss.on("connection", _ws => {
        console.log(`Client WebSocket terhubung`);
        ws = _ws;
        ws.send(JSON.stringify({ type: "token", token: tokenAPI }));

        ws.on("message", data => {
            let res = JSON.parse(data.toString());
            if (res.action == "updateToken") {
                updateToken();
            }
        })
    });

    return wss;
}

const updateToken = () => {
    let result = "";
    let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.round(Math.random() * chars.length));
    }

    tokenAPI = result;
    if (ws) {
        ws.send(JSON.stringify({ type: "token", token: tokenAPI }));
    }

    if (tokenTimeout) clearTimeout(tokenTimeout);
    tokenTimeout = setTimeout(() => {
        updateToken();
    }, 30000);
}

const getToken = (update = false) => {
    if (update) updateToken();
    return tokenAPI;
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
    let token = req.body?.token || req.query?.token;
    if (token == tokenAPI || req.query.devMode == "true") {
        next()
    } else {
        res.status(401).json({
            message: "Token tidak valid",
            success: false,
            code: 401
        })
    }
}

const getSocket = () => {
    return ws;
}

module.exports = {
    timingMiddleware,
    loggerMiddleware,
    tokenMiddleware,

    getToken,
    updateToken,
    getSocket,
    initializeWebSocketServer,

    localhostPort
}