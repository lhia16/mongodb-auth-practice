const { promisify } = require("util");
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const dotenv = require('dotenv');

exports.isLoggedIn = async (req, res, next) => {
    console.log("Checking if user is logged in")

    if(req.cookies.jwt) {

        const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
        console.log("Cookie exists")
        console.log("token decoded")
        console.log(decoded);

        req.userFound = await User.findById(decoded.id);
    }
    next();
}

exports.logout = (req, res, next) => {
    
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2*1000),
        httpOnly: true
    })

    next();
};

exports.logIn = (userId, response) => {

    const token = jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
        
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    }

    response.cookie('jwt', token, cookieOptions)
}