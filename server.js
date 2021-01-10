const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("./models/user");
const Blogpost = require("./models/blogpostModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const auth = require("./middlewares/auth")

const app = express();
dotenv.config({path: './.env'});

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}) .then( () => console.log("MongoDB is connected"));

const viewsPath = path.join(__dirname, '/views');
const publicDirectory = path.join(__dirname, '/public');

app.set('views', viewsPath);
app.set('view engine', 'hbs');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({extended: false}));
app.use(express.json({extended: false}));
app.use( cookieParser() );


app.get("/", (req, res) => {
    res.render("index")
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    console.log(req.body);
    
    const email = await User.findOne({email: req.body.userEmail})

    if (req.body.userPassword != req.body.userPasswordConfirm) {
        res.render("register", {
            error: "Please check that the passwords match"
        })
    } else if (email) {
        res.render("register", {
            error: "There is already an account with this email"
        })

    } else {
    const hashedPassword = await bcrypt.hash(req.body.userPassword, 8);
    const registered = await User.create({
        name: req.body.userName,
        email: req.body.userEmail,
        password: hashedPassword
    
    });
    auth.logIn(registered._id, res)

    res.redirect("/profile")
    };
    
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", auth.isLoggedIn, async (req, res) => {
    const user = await User.findOne({email: req.body.userEmail})

    const adminAccess = user.admin
    const isMatch = await bcrypt.compare(req.body.userPassword, user.password)

    if( isMatch && !adminAccess) {

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        console.log(token);

        const cookieOptions = {
            expires: new Date(
                Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
            ),
            httpOnly: true
        }

        res.cookie("jwt", token, cookieOptions);

        res.redirect("profile")  

    } else if (isMatch && adminAccess) {  

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        console.log(token);

        const cookieOptions = {
            expires: new Date(
                Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
            ),
            httpOnly: true
        }

        res.cookie("jwt", token, cookieOptions);

        res.redirect("adminPage")
    } else {
        res.send("Login failed")
    }
});

app.get("/logout", auth.logout, (req, res) => {
    res.render("index");
});

app.get("/profile", auth.isLoggedIn, async (req, res) => {
    try{
        const adminAccess = req.userFound.admin ? true : false
        if(req.userFound) {
            
            res.render("profile", {
                name: req.userFound.name,
                email: req.userFound.email
            }); 
        } else if (adminAccess) {
            res.redirect("adminPage");
        }
    } catch(error) {
        res.send("User not found");
    };
});

app.get("/delete", auth.isLoggedIn, async (req, res) => {
    try{
        await User.findByIdAndDelete(req.userFound._id);
        res.send("User has been deleted");
    } catch(error) {
        res.send("That user does not exist");
    };
});

app.get("/adminPage", auth.isLoggedIn, (req, res) => {

    const adminAccess = req.userFound.admin ? true : false

    if (req.userFound && adminAccess) {
    res.render("adminPage")
    } else {
        res.redirect("profile")
    }
});

app.get("*", (req, res) => {
    res.send("error");
});

app.listen(9000, () => {
    console.log("Server is running on Port 9000");
});