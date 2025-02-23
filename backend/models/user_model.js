const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

const userSchema = Schema(
  {
    email: {
      type: "string",
      required: true,
    },
    username: {
      type: "string",
      required: true,
    },

    message: {
      type: "string",
      default: "I am here",
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
  },
  {
    timestamps: true,
  }
);
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
