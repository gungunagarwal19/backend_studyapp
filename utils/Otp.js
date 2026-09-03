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
        name: 'Learnmate'
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

const sendResetPasswordEmail = async (recipientEmail, resetUrl) => {

    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey =
        process.env.EDGY_OTP;

    const apiInstance =
        new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
        email: 'cipherstar500@gmail.com',
        name: 'Learnmate'
    };

    const receivers = [
        {
            email: recipientEmail
        }
    ];

    const emailContent = {
        sender,
        to: receivers,
        subject: 'Reset Your Learnmate Password',

        htmlContent: `
            <html>
                <body style="
                    margin: 0;
                    padding: 0;
                    background-color: #f5f7ff;
                    font-family: Arial, sans-serif;
                ">

                    <div style="
                        max-width: 500px;
                        margin: 40px auto;
                        background: white;
                        padding: 35px;
                        border-radius: 10px;
                        box-shadow: 0 5px 20px rgba(0,0,0,0.08);
                        text-align: center;
                    ">

                        <h2 style="
                            color: #4f46e5;
                            margin-bottom: 20px;
                        ">
                            Reset Your Password
                        </h2>

                        <p style="
                            color: #555;
                            font-size: 15px;
                            line-height: 1.6;
                        ">
                            We received a request to reset your
                            Learnmate password.
                        </p>

                        <p style="
                            color: #555;
                            font-size: 15px;
                            line-height: 1.6;
                        ">
                            Click the button below to create a new password.
                        </p>

                        <a
                            href="${resetUrl}"
                            style="
                                display: inline-block;
                                margin-top: 20px;
                                padding: 13px 25px;
                                background-color: #4f46e5;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                                font-weight: bold;
                            "
                        >
                            Reset Password
                        </a>

                        <p style="
                            margin-top: 25px;
                            color: #888;
                            font-size: 13px;
                        ">
                            This password reset link will expire
                            in 15 minutes.
                        </p>

                        <p style="
                            color: #aaa;
                            font-size: 12px;
                        ">
                            If you didn't request a password reset,
                            you can safely ignore this email.
                        </p>

                    </div>

                </body>
            </html>
        `
    };

    try {
        const response =
            await apiInstance.sendTransacEmail(emailContent);

        return response;

    } catch (error) {
        throw error;
    }
};


module.exports = {generateOtp, generateToken, sendOtpEmail,sendResetPasswordEmail};