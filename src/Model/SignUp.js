const mongoose = require('mongoose');
const { Schema } = mongoose;

const signUpSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true
    },
    token: {
        type: String
    },
    tokenExpiry: {
        type: Date
    }
}, {
    timestamps: true
});


signUpSchema.index({otpExpiry: 1}, {expireAfterSeconds: 0});
signUpSchema.index({ tokenExpiry: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SignUp", signUpSchema);