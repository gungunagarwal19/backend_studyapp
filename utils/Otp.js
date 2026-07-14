const crypto = require('crypto');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const generateOtp = () => {
    var nums = "0123456789"
    let OTP = "";
    for (let i = 0; i < process.env.OTP_LENGTH; i++){
        const randomIndex = crypto.randomInt(0, nums.length);
        OTP += nums[randomIndex];
    }
    return OTP;
}

const generateToken = () => {
    return crypto.randomBytes(32).toString('hex'); 
};

const sendOtpEmail = async (recipientEmail, otp) => {

    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.EDGY_OTP;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
        email: 'cipherstar500@gmail.com', 
        name: 'Edgy'
    };

    const receivers = [
        {
            email: recipientEmail
        }
    ];

    const emailContent = {
        sender,
        to: receivers,
        subject: 'Your OTP Code',
        htmlContent: `<html><body><h2>Your OTP is: <strong>${otp}</strong></h2></body></html>`
    };

    try {
        const response = await apiInstance.sendTransacEmail(emailContent);
        return otp;
    } catch (error) {
        throw error;
    }
};

module.exports = {generateOtp, generateToken, sendOtpEmail};