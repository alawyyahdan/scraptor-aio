const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret-scraptor-123';

// Verify token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: "Token is not valid!" });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: "You are not authenticated!" });
    }
};

module.exports = {
    verifyToken,
    JWT_SECRET
};
