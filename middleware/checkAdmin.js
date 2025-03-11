// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next(); // Proceed to the next middleware or route handler
    } else {
        res.status(403).send('Access denied. Admins only.');
    }
};

module.exports = checkAdmin;
