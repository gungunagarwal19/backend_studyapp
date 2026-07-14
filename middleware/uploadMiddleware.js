const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 8 * 1024 * 1024
    }
});

function uploadWithErrorHandler(req, res, next) {
    upload.single('file')(req, res, function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size is too large. Max limit is 8MB.' });
            }
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}

module.exports = uploadWithErrorHandler;