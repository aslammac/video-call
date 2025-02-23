const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const fileUpload = multer({
  //   dest: "uploads/images",
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./uploads/images");
    },
    filename: (req, file, cb) => {
      cb(null, uuidv4() + file.originalname);
    },
  }),
  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    // if (ext !== ".png" && ext !== ".jpg" && ext !== ".gif" && ext !== ".jpeg") {
    //   console.log(file.mimetype);
    //   return callback(new Error("Only images are allowed"));
    // }
    callback(null, true);
  },
});

module.exports = fileUpload;
