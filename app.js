//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash'); //Requiring lodash module
const mongoose = require("mongoose");

const homeStartingContent = "A Proactive blog site where you find content that always enrich your knowledge & take you forward"
const aboutContent = "Who I am & What I do ?";
const contactContent = "Want to know about our upcoming daily blogs ? Fill out the form below to get subscribed to our g-mail service";

//Setting up the database
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/blogDB", {useNewUrlParser : true});
const postSchema = new mongoose.Schema({
  name : String,
  title : String,
  content : String,
  date : Date
})
const Post = mongoose.model("Post", postSchema);

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//Global array for stories all postTitle & postBody
// let postArr = [];
app.get("/", function(req, res){
  Post.find({}).then(function(posts){
    res.render("home", {homeContent : homeStartingContent, postContent : posts});
  });
  // console.log(postArr);
})
app.get("/about", function(req, res){
  res.render("about", {aboutContent : aboutContent})
})
app.get("/contact", function(req, res){
  res.render("contact", {contactContent : contactContent})
})
app.get("/compose", function(req, res){
  res.render("compose")
})

//Encorporating express routing parameters
app.get("/posts/:postId", function(req, res){
  // console.log(req.params.postId);
  const requestedPostId = req.params.postId;

  Post.findOne({_id : requestedPostId}).then(function(foundPost){
    res.render("post", {getName : foundPost.name, getTitle : foundPost.title, getContent : foundPost.content, getDate : foundPost.date});
  })
})

app.post("/compose",function(req, res){
  //Get data from textfields using bodyParser
  // const posts = {
  //   title : req.body.postTitle,
  //   content : req.body.postBody
  // };
  //
  // //Append data into array
  // postArr.push(posts)
  const post = new Post({
    name : req.body.postName,
    title : req.body.postTitle,
    content : req.body.postBody,
    date : new Date()
  });
  post.save();
  //Then redirect to home page
  res.redirect("/")
})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
