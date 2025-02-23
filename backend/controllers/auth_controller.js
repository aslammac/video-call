const User = require("../models/user_model");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const io = require("../socket");
const admin = require("firebase-admin");
const firebase = require("firebase");
const passport = require("passport");
//!Signup controller


exports.signup = async (req, res, next) => {


  User.register(new User({ email: req.body.email, username: req.body.name, message: req.body.status }), req.body.password, function (err, user) {
    if (err) {
      res.json({ success: false, message: "Your account could not be saved. Error: " + err });
    }
    else {
      // TODO document why this block is empty


    }
  });
  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   const error = Error("validation failed");
  //   error.statusCode = 422;
  //   error.data = error.array();
  //   throw error;
  // }
  // const alreadyUser = await User.findOne({ email: req.body.email });
  // if (alreadyUser) {
  //   const error = Error("Email already found");
  //   error.statusCode = 422;
  //   //   error.data = error.array();
  //   next(error);
  // } else {
  //   const email = req.body.email;
  //   const password = req.body.password;
  //   const name = req.body.name;
  //   admin
  //     .auth()
  //     .createUser({
  //       email: email,
  //       emailVerified: false,
  //       phoneNumber: "+919744770288",
  //       password: password,
  //       displayName: "John Doe",
  //       photoURL: "http://www.example.com/12345678/photo.png",
  //       disabled: false,
  //     })
  //     .then((userRecord) => {
  //       // See the UserRecord reference doc for the contents of userRecord.
  //       console.log("Successfully created new user:", userRecord.uid);
  //     })
  //     .catch((error) => {
  //       console.log("Error creating new user:", error);
  //     });
  //   bcrypt
  //     .hash(password, 12)
  //     .then(async (hashedPassword) => {
  //       const user = User({
  //         email: email,
  //         password: hashedPassword,
  //         name: name,
  //       });
  //       const result = await user.save();
  //       //   console.log(result);
  //       res.json({
  //         result: result,
  //       });
  //     })
  //     .catch((err) => {
  //       if (!err.statusCode) {
  //         err.statusCode = 500;
  //       }
  //       next(err);
  //     });
  // }
};

//!login controllers
loginFirebase = (email, password) => {
  // const email = email;
  // const password = password;
  // const key = req.body.key;
  // const _key = '_my_key_';
  let token = "";
  if (true) {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((user) => {
        //The promise sends me a user object, now I get the token, and refresh it by sending true (obviously another promise)
        console.log(user.user.email);
        // user
        //   .getIdToken(true)
        //   .then((token) => {
        //     rsp.writeHead(200, { "Content-Type": "application/json" });
        //     rsp.end(JSON.stringify({ token: token }));
        //   })
        //   .catch((err) => {
        //     rsp.writeHead(500, { "Content-Type": "application/json" });
        //     rsp.end(JSON.stringify({ error: err }));
        //   });
      })
      .catch((err) => { });
  } else {
  }
};
exports.login = async (req, res, next) => {

  if (!req.body.username) {
    res.json({ success: false, message: "Username was not given" })
  }
  else if (!req.body.password) {
    res.json({ success: false, message: "Password was not given" })
  }
  else {
    passport.authenticate("local", function (err, user, info) {
      if (err) {
        res.json({ success: false, message: err });
        console.log(err);
      }
      else {
        if (!user) {
          res.json({ success: false, message: "username or password incorrect" });
        }
        else {
          const token = jwt.sign({ userId: user.email, username: user.username }, "secretkey", { expiresIn: "24h" });
          res.json({ success: true, message: "Authentication successful", token: token });
        }
      }
    })(req, res);
  }


  // const email = req.body.email;
  // const password = req.body.password;
  // loginFirebase(email, password);
  // try {
  //   const user = await User.findOne({ email: email });
  //   if (!user) {
  //     const error = new Error("email not found");
  //     error.statusCode = 404;
  //     throw error;
  //   }
  //   const result = await bcrypt.compare(password, user.password);
  //   if (!result) {
  //     const error = new Error("Password not match");
  //     error.statusCode = 401;
  //     throw error;
  //   }
  //   const token = jwt.sign(
  //     {
  //       email: user.email,
  //       userId: user._id.toString(),
  //     },
  //     "uppu"
  //     // { noTimestamp: true }
  //   );
  //   io.getIO().emit("login", JSON.stringify({ action: "login", post: result }));
  //   res.status(201).json({
  //     message: "logged in",
  //     userId: user._id.toString(),
  //     email: user.email,
  //     token: token,
  //     //   expiresIn: Date( Date.now() +  * 24 * 60 * 60 * 1000),
  //   });
  // } catch (err) {
  //   if (!err.statusCode) {
  //     err.statusCode = 500;
  //   }
  //   next(err);
  // }
};

//!token refresh

exports.getToken = (req, res, next) => {
  const existingToken = req.body.token;
  //   const email = req.body.email;
  //   const userId = req.body.userId;
  const decoded = jwt.decode(existingToken);
  if (decoded != null) {
    const token = jwt.sign(
      {
        email: decoded["email"],
        userId: decoded["userId"],
      },
      "uppu",
      { expiresIn: "7h" }
    );

    res.status(201).json({
      token: token,
      userId: decoded["userId"],
      email: decoded["email"],
    });
  }
  else {
    res.status(401).json({
      message: "Invalid token",
    });
  }
};
