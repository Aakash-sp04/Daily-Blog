//jshint esversion:6
require('dotenv').config(); //At the top only to write
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash'); //Requiring lodash module
const mongoose = require("mongoose");
const request = require("request")
const https = require("https")
const moment = require("moment")
//Login & signup required modules
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const homeStartingContent = "A Proactive blog site where you find content that always enrich your knowledge & take you forward"
const aboutContent = "Who I am & What I do ?";
const contactContent = "Want to know about our upcoming daily blogs ? Fill out the form below to get subscribed to our g-mail service";

const app = express();
app.set('views','../frontend/views');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("../frontend/public"));
app.use(session({ //session Setup level-5
  secret: "Our little secret",
  resave: false, //Forces the session to be saved back to the session store, even if the session was never modified during the request.
  saveUninitialized: false //Choosing false is useful for implementing login sessions, reducing server storage usage,
  //or complying with laws that require permission before setting a cookie.
  //Choosing false will also help with race conditions where a client makes multiple parallel requests without a session.
}));
app.use(passport.initialize()); //Initialize passport
app.use(passport.session()); //To use passport for setting up our session

//Setting up the database
mongoose.set('strictQuery', true);
mongoose.connect("mongodb+srv://aakashspachchigar:Dhrutisp@cluster0.hssx3ey.mongodb.net/blogDB", {
  useNewUrlParser: true
});
const postSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    min : 5
  },
  title: {
    type: String,
    required: true,
    min : 10
  },
  content: {
    type: String,
    required: true,
    min : 50
  },
  date: String
})
const Post = mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    min : 8
  },
  email: {
    type: String,
    unique: true,
    min : 10
  },
  password: {
    type: String,
    min : 8
  },
  googleId: String,
  blog: [postSchema] //Subdocument i.e. Array of Objects
})


//NOTE:- To keep encrypt after schema creation & before actual obj. creation
// userSchema.plugin(encrypt, {secret : process.env.SECRET, encryptedFields : ["password"]});
userSchema.plugin(passportLocalMongoose); //Hash & Salt password in Level-5
userSchema.plugin(findOrCreate); //Level-6 OAuth findOrCreate lougin

const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
//level-6 OAuth sign-in with google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://daily-blog-we0e.onrender.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

//Global array for stories all postTitle & postBody
// let postArr = [];
app.get("/", function(req, res) {
  Post.find({}).then(function(posts) {
    res.render("home", {
      homeContent: homeStartingContent,
      postContent: posts,
      val: req.isAuthenticated()
    });
  });
  // console.log(postArr);
})
//Level-6 OAuth sign-in with Google
app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["profile"]
  })
);
app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/compose');
  });

app.get("/login", function(req, res) {
  res.render("login");
})
app.get("/register", function(req, res) {
  res.render("register");
})
app.get("/about", function(req, res) {
  res.render("about", {
    aboutContent: aboutContent,
    val: req.isAuthenticated()
  })
})
//Here, we do subcription process of Mailchimp
app.get("/contact", function(req, res) {
  res.render("contact", {
    contactContent: contactContent
  })
})
app.get("/compose", function(req, res) {
  if (req.isAuthenticated()) { //is user authenticate than redirect to compose
    res.render("compose", {
      val: req.isAuthenticated()
    })
  } else {
    res.render("login", {
      val: req.isAuthenticated()
    })
  }
})
app.get("/myblog", function(req, res) {
  User.findById(req.user.id).then(function(foundUser) {
    if (foundUser) {
      res.render("myblog", {
        postContent: foundUser.blog
      });
    }
  }).catch(function(err) {
    console.log(err);
  })
})
app.get("/success", function(req, res) {
  res.render("success")
})
app.get("/failure", function(req, res) {
  res.render("failure")
})
app.get("/error", function(req, res) {
  res.render("error");
})
//Encorporating express routing parameters
app.get("/posts/:postId", function(req, res) {
  // console.log(req.params.postId);
  const requestedPostId = req.params.postId;

  Post.findOne({
    _id: requestedPostId
  }).then(function(foundPost) {
    res.render("post", {
      getName: foundPost.name,
      getTitle: foundPost.title,
      getContent: foundPost.content,
      getDate: foundPost.date,
      val: req.isAuthenticated()
    });
  })
})

app.get("/logout", function(req, res) {
  req.logout(function(err) { //To terminate a session Level-5 Cookie & Session
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
})

app.post("/register", function(req, res) {
  //register() by-default function {columns to save in database}
  // See in the above code we did not define our password in New user.
  // Instead, we use the password with the User.Register() which is a passport-local-mongoose function
  User.register({
    username: req.body.username,
    email: req.body.email
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local", {
        failureRedirect: '/error'
      })(req, res, function() {
        res.redirect("/login");
      })
    }
  })
})
app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local", {
        failureRedirect: '/error'
      })(req, res, function() { //{ failureRedirect: '/error' } if unauthorized user try to login
        res.redirect("/compose");
      })
    }
  })
})
app.post("/compose", function(req, res) {
  //Get data from textfields using bodyParser
  // const posts = {
  //   title : req.body.postTitle,
  //   content : req.body.postBody
  // };
  //
  // //Append data into array
  // postArr.push(posts)
  const options = {
    day: "numeric",
    month: "long",
    year: "numeric"
  }
  const post = new Post({
    name: req.body.postName,
    title: req.body.postTitle,
    content: req.body.postBody,
    date: new Date().toLocaleDateString("en-US", options)
  });
  post.save();

  User.findById(req.user.id).then(function(foundUser) {
    if (foundUser) {
      foundUser.blog.push(post); //Appending into array
      foundUser.save();
      res.redirect("/"); //Then redirect to home page
    }
  }).catch(function(err) {
    console.log(err);
  })
})

//Here, we do subcription process of Mailchimp
app.post("/contact", function(req, res) {
  const firstname = req.body.firstname
  const lastname = req.body.lastname
  const email = req.body.email

  const data = {
    members: [{
      email_address: email,
      status: "subscribed",
      merge_fields: {
        FNAME: firstname,
        LNAME: lastname
      }
    }]
  }
  const jsonData = JSON.stringify(data); //Because .js take data as single string format
  //that we are going to send (POST) onto the server

  const apiKey = process.env.MAILCHAMP_API_KEY;
  const listID = process.env.MAILCHAMP_LIST_ID;
  const url = "https://us21.api.mailchimp.com/3.0/lists/" + listID
  const options = {
    method: "POST",
    auth: "aakash1:" + apiKey //anyString:API key
  }

  const request = https.request(url, options, function(response) {
    if (response.statusCode === 200) {
      console.log("success------------------>");
      res.render("success")
    } else {
      console.log("failure------------------>");
      res.render("failure")
    }

    response.on("data", function(data) {
      // console.log(JSON.parse(data));
    })
  })
  request.write(jsonData); //to write jsonData onto the Mailchimp server
  request.end();
})
app.post("/success", function(req, res) {
  res.redirect("/")
})
app.post("/failure", function(req, res) {
  res.redirect("/contact")
})

app.listen(3000, function() {
  console.log(__dirname);
  console.log("Server started on port 3000");
});
