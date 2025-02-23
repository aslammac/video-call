const express = require("express");
const feedController = require("../controllers/feed_controller");
const { body } = require("express-validator");
const router = express.Router();
const fileUpload = require("../middleware/file-upload");
const isAuth = require("../middleware/is-auth");

// GET /feed/posts
router.get("/posts", isAuth, feedController.getPosts);
//GET /feed/post/:postId
router.get("/post/:postId", feedController.getPostById);
// POST /feed/post
router.put(
  "/post/:postId",
  fileUpload.single("img"),
  [
    body("title").trim().isLength({
      min: 2,
    }),
    body("content").trim().isLength({
      min: 8,
    }),
  ],
  feedController.updatePost
);

router.post(
  "/post",
  isAuth,
  fileUpload.single("img"),
  [
    body("title").trim().isLength({
      min: 2,
    }),
    body("content").trim().isLength({
      min: 8,
    }),
  ],
  feedController.createPost
);
router.delete("/post/:postId", feedController.deletePostById);

module.exports = router;
