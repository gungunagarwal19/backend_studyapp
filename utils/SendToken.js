const sendToken = (user, res, statusCode) => {
    const token = user.getJwtToken();

    const options = {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
        secure: process.env.NODE_ENV === 'production',    
        path: '/'
    };

    res.status(statusCode)
        .cookie("Learnmate_TOKEN", token, options)
        .json({
            success: true,
            user,
            token,
            message: "Successfully Logged In"
        });
};

module.exports = sendToken;