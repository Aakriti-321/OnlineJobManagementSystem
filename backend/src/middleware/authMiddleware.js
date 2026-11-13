
import jwt from "jsonwebtoken";

// Authentication middleware
export const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token found"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        console.log("Logged-in user:", req.user);

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

// Authorization middleware
export const authorize = (...roles) => {
    return (req, res, next) => {
        console.log("User role:", req.user?.role);
        console.log("Allowed roles:", roles);

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You don't have permission."
            });
        }

        next();
    };
};
