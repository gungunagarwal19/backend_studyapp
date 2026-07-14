const mongoose = require('mongoose')

const resolveMongoUri = () => {
    // Prefer common env names if present, fallback to Database_URL
    return (
        process.env.MONGODB_URI ||
        process.env.MONGODB_URL ||
        process.env.MONGO_URI ||
        process.env.MONGO_URL ||
        process.env.Database_URL
    );
}

const connectDB = async () => {
    const mongoUri = resolveMongoUri();
    if (!mongoUri) {
        console.error('MongoDB connection string is missing. Set MONGODB_URI (or Database_URL).')
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri, {
            // modern drivers ignore these in Mongoose 7+, but safe to pass
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });

        const { host, name } = mongoose.connection;
        console.log(`MongoDB connected: host=${host} db=${name}`)
    } catch (error) {
        console.error('Error connecting Database:', error)
        // Provide a hint for common Atlas IP whitelist issues
        if (error && error.name === 'MongooseServerSelectionError') {
            console.error('Hint: If using MongoDB Atlas, ensure your current IP is whitelisted or use 0.0.0.0/0 for dev. Also verify username, password, and SRV string.');
        }
        process.exit(1);
    }
}

module.exports = connectDB;