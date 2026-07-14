const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    error: {
        type: String
    },
    result: {
        flashcardsCount: Number,
        pineconeUpsertedCount: Number
    }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
