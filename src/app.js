const express = require('express');
const cookieParser = require("cookie-parser");
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())



const userRouter = require('./Router/User');
app.use('/api/user', userRouter);

const sectionRouter = require('./Router/Section');
app.use('/api/section', sectionRouter);

const uploadRouter = require('./Router/Upload');
app.use('/api/upload', uploadRouter);

const flashRouter = require('./Router/FlashCard');
app.use('/api/flashcards', flashRouter);


// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
        console.error('Error:', err);
    } else {
        console.warn(`[Client Error - ${statusCode}] ${err.message}`);
    }
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});


module.exports = app;
