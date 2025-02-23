const express = require("express");
const { body, check } = require("express-validator");
const router = express.Router();

//controllers
const auth = require("../controllers/auth_controller");
//models
const User = require("../models/user_model");
const { client } = require('../middleware/twilioModule');

router.post(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter your email")
      //   .custom((value) => {
      //     return User.findUserByEmail(value).then((user) => {
      //       if (user) {
      //         return Promise.reject("E-mail already in use");
      //       }
      //     });
      //   })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 8 }),
    // body("name").trim().not().isEmpty(),
  ],
  //   check("email").custom((value) => {
  //     return User.findByEmail(value).then((user) => {
  //       if (user) {
  //         return Promise.reject("E-mail already in use");
  //       }
  //     });
  //   }),
  auth.signup
);

router.post("/login", auth.login);

router.get("/token", auth.getToken);
router.post("/send-sms", async (req, res) => {
  const { message } = req.body;
  const verification = await client.messages.create({
    to: "+919744770288"
  })

  console.log(verification);
  res.json({
    message: "SMS send to +919744770288",
    details: verification
  })

})
router.post("/send-otp", async (req, res) => {
  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFICATION_SID)
    .verifications.create({
      channel: "sms",
      to: "+919744770288",
    });

  console.log(verification);
  res.json({
    message: "SMS send to +919744770288",
    details: verification
  })
})
router.post("/verify-sms", async (req, res) => {
  const { code } = req.body;
  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFICATION_SID)
    .verificationChecks.create({
      code: code,
      to: "+919744770288",
    });



  console.log(verification);
  res.json({
    message: "Verified"
  })
})


module.exports = router;
