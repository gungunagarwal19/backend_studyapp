const mongoose = require('mongoose')
const {Schema} = mongoose;

const sectionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        trim: true,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    files: [{
        type: String
    }]
}, {
    timestamps: true
})

module.exports = mongoose.model("Section", sectionSchema);