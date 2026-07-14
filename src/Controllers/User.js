const bcrypt = require('bcrypt')
const User = require('../Model/User')
const catchAsyncError = require("../../middleware/catchAsyncError");
const ErrorHandling = require("../../utils/ErrorHandling");
const { generateOtp, generateToken, sendOtpEmail } = require('../../utils/Otp');
const SignUp = require('../Model/SignUp')
const SendToken = require('../../utils/SendToken')
const jwt = require('jsonwebtoken')

const signUp = {
    initiate: catchAsyncError(async (req, res, next) => {
        const { email, name } = req.body;
        if (!email) {
            return next(new ErrorHandling(400, "Email is requierd!"))
        }
        if (!name) {
            return next(new ErrorHandling(400, "Name is required!"))
        }

        let user = await User.findOne({ email });

        if (user) {
            return next(new ErrorHandling(400, "User already exists , Try Logging In!"))
        }

        await SignUp.deleteOne({ email });

        const OTP = generateOtp();

        if (OTP.length != process.env.OTP_LENGTH) return next(new ErrorHandling(500, "Error in generating OTP"));

        const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

        const newSignup = new SignUp({
            email,
            name,
            otp: OTP,
            otpExpiry
        });

        await newSignup.save();

        try {
            await sendOtpEmail(email, OTP);
        } catch (err) {
            return next(new ErrorHandling(500, "Failed to send OTP email"));
        }

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        })
    }),

    verifyOtp: catchAsyncError(async (req, res, next) => {
        const { email, otp } = req.body;

        if (!email) {
            return next(new ErrorHandling(400, "Email Id is required"))
        }

        if (!otp) return next(new ErrorHandling(400, "OTP is required"))

        const user = await SignUp.findOne({ email });

        if (!user) {
            return next(new ErrorHandling(400, "User not found"));
        }

        if (user.otpExpiry < new Date()) {
            return next(new ErrorHandling(400, "OTP has expired. Please request a new one."));
        }

        if (user.otp !== otp) {
            return next(new ErrorHandling(400, "Invalid OTP"));
        }

        const tokenVerification = generateToken();
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

        const updatedUser = await SignUp.findOneAndUpdate(
            { email },
            {
                token: tokenVerification,
                tokenExpiry: tokenExpiry,
                otp: "verified",
                otpExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            token: tokenVerification,
            email: email
        })
    }),

    saveUser: catchAsyncError(async (req, res, next) => {
        const { token, password, confirmPassword } = req.body;

        if (!token) return next(new ErrorHandling(400, "Verification token is required"));

        if (!password || !confirmPassword) {
            return next(new ErrorHandling(400, "Password and Confirm Password is required"));
        }

        if (password != confirmPassword) {
            return next(new ErrorHandling(400, "Passwords do not match"))
        }

        const user = await SignUp.findOne({
            token,
            tokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return next(new ErrorHandling(400, "Invalid or Expired Verification token"))
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email: user.email,
            name: user.name,
            password: hashedPassword
        })

        await newUser.save();
        await SignUp.deleteOne({ _id: user._id });

        SendToken(newUser, res, 201);
    })
}

const logIn = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) return next(new ErrorHandling(400, "Please enter email and password"))

    const user = await User.findOne({ email });
    if (!user) return next(new ErrorHandling(401, "You have not registered yet. Plaese Sign Up first"))

    const isCorrect = await (bcrypt.compare(password, user.password));
    if (!isCorrect) return next(new ErrorHandling(401, "Incorrect Password"));

    SendToken(user, res, 200);

})

const logout = catchAsyncError(async (req, res, next) => {
    const token = req.cookies.Edgy_TOKEN;
    if (!token) {
        return res.status(200).json({
            success: true,
            message: "Already logged out"
        });
    }

    res.clearCookie('Edgy_TOKEN', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
    });
    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
});

const isAuthenticated = catchAsyncError(async (req, res, next) => {
    const token = req.cookies.Edgy_TOKEN;
    if (!token) {
        return next(new ErrorHandling(401, "Please login to access this resource"));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new ErrorHandling(401, "User not found"));
        }
        req.user = user;
        next();
    } catch (error) {
        return next(new ErrorHandling(401, "Invalid token. Please login again"));
    }
});

const getProfile = catchAsyncError(async (req, res, next) => {
    const _id = req.user._id;
    const user = await User.findById(_id);
    res.status(200).send({
        user,
    });
});


module.exports = { signUp, logIn, logout, isAuthenticated, getProfile }