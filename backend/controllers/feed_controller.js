const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user_model");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  const options = {
    page: currentPage,
    limit: perPage,
    sort: { createdAt: -1 },
  };
  let totalItems;
  try {
    // totalItems = await Post.find().countDocuments();
    var result = await Post.paginate({}, options);
    // var result = await Post.find()
    //   .skip((currentPage - 1) * perPage)
    //   .limit(perPage);
    if (result.docs.length == 0) {
      error = Error("No post found");
      error.status = 422;
      throw error;
    }

    res.json({
      message: "success",
      posts: result.docs,
      totalItems: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.getPostById = (req, res, next) => {
  const _postId = req.params.postId;
  var result = Post.findById({ _id: _postId })
    .then((result) => {
      if (!result) {
        const error = Error("Post not found");
        error.status = 422;
        throw error;
      }
      res.json({
        message: "success",
        posts: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
      res.status(422).json({ message: "error", error: err });
    });
};
exports.deletePostById = async (req, res, next) => {
  const _postId = req.params.postId;
  var result = Post.findByIdAndDelete({ _id: _postId })
    .then(async (result) => {
      // console.log(result.creator);
      const userId = result.creator;
      const user = await User.findById(userId.toString());
      user.posts.pull(_postId);
      clearImage(result.imageUrl);
      user.save();
      res.json({
        message: "success",
        posts: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  // console.log(errors);
  if (!errors.isEmpty()) {
    const error = Error("Validation Failed, Entered data is incorrect");
    error.status = 422;
    throw error;
  }
  var fileName = req.file.filename;
  var titleText = req.body.title;
  var contentText = req.body.content;
  // console.log(titleText, contentText);
  const post = Post({
    title: titleText,
    content: contentText,
    creator: req.userId,
    imageUrl: "/uploads/images/" + fileName,
  });
  post
    .save()
    .then(async (result) => {
      const user = await User.findById(req.userId);
      if (!Array.isArray(user.posts)) {
        user.posts = [];
      } else {
        user.posts.push(post);
      }
      user.save();
      io.getIO().emit(
        "posts",
        JSON.stringify({ action: "create", post: result })
      );
      res.status(201).json({
        message: "success",
        post: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  // console.log(errors);
  if (!errors.isEmpty()) {
    const error = Error("Validation Failed, Entered data is incorrect");
    error.status = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.imageUrl;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const err = new Error("no file uploaded");
    err.status = 422;
    throw err;
  }
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const err = new Error("Could not found post");
      err.statusCode = 404;
      throw err;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;
    const result = await post.save();
    res.status(200).json({ message: "success", post: result });
  } catch (error) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  console.log(filePath);
  fs.unlink(filePath, (err) => console.error(err));
};
