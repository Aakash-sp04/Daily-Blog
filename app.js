//jshint esversion:6
require('dotenv').config(); //At the top only to write
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash'); //Requiring lodash module
const mongoose = require("mongoose");
const request = require("request")
const https = require("https")
const moment = require ("moment")

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
  date : String
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
//Here, we do subcription process of Mailchimp
app.get("/contact", function(req, res){
  res.render("contact", {contactContent : contactContent})
})
app.get("/compose", function(req, res){
  res.render("compose")
})
app.get("/success", function(req, res){
  res.render("success")
})
app.get("/failure", function(req, res){
  res.render("failure")
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
  const options = {
    day : "numeric",
    month : "long",
    year : "numeric"
  }
  const post = new Post({
    name : req.body.postName,
    title : req.body.postTitle,
    content : req.body.postBody,
    date : new Date().toLocaleDateString("en-US", options)
  });
  post.save();
  //Then redirect to home page
  res.redirect("/")
})

//Here, we do subcription process of Mailchimp
app.post("/contact",function(req,res){
  const firstname = req.body.firstname
  const lastname = req.body.lastname
  const email = req.body.email

  const data = {
    members : [
      {
        email_address : email,
        status : "subscribed",
        merge_fields : {
          FNAME : firstname,
          LNAME : lastname
        }
      }
    ]
  }
  const jsonData  = JSON.stringify(data); //Because .js take data as single string format
                                          //that we are going to send (POST) onto the server

  const apiKey = process.env.MAILCHAMP_API_KEY;
  const listID = process.env.MAILCHAMP_LIST_ID;
  const url = "https://us21.api.mailchimp.com/3.0/lists/" + listID
  const options = {
    method : "POST",
    auth : "aakash1:" + apiKey   //anyString:API key
  }

  const request = https.request(url, options, function(response){
    if(response.statusCode === 200){
      console.log("success------------------>");
      res.render("success")
    }else{
      console.log("failure------------------>");
      res.render("failure")
    }

    response.on("data", function(data){
      // console.log(JSON.parse(data));
    })
  })
  request.write(jsonData);  //to write jsonData onto the Mailchimp server
  request.end();
})
app.post("/success",function(req, res){
  res.redirect("/")
})
app.post("/failure",function(req, res){
  res.redirect("/contact")
})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
