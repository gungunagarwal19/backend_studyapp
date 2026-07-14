const mongoose = require('mongoose') 
const {Schema} = mongoose

const flashcardSchema = new Schema({
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    question: {
        type: String, 
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    explanation: {
        type: String
    },
    ease: { 
        type: Number, 
        default: 2.5 
    },
    interval: { 
        type: Number, 
        default: 1 
    },
    repetitions: { 
        type: Number, 
        default: 0 
    },
    lastReviewed: {
        type: Date,
        default: Date.now
    },
    nextReview: { 
        type: Date, 
        default: Date.now 
    },
},    {
    timestamps: true
}
)



module.exports = mongoose.model('FlashCard', flashcardSchema);