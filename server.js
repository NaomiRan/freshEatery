/*************************************************************************************
*Welcome to Fresh Eatery, your gateway to a healthier lifestyle! 
Build and customize web pages effortlessly with user-friendly platform, 
crafted with HTML, CSS, NodeJs, Express, and MongoDB. Experience the essence of freshness 
with our organic and healthy food delivery directly from the farm. Trace the journey from 
producer to your doorstep, ensuring transparency in every step. Whether you prefer cooking 
with a variety of fresh ingredients for full nutrition or opting for daily doorstep deliveries, 
Fresh Eatery is your go-to destination for a nourishing and convenient culinary experience.
*
**************************************************************************************/
// npm init
// npm i express
// npm i ejs express-ejs-layouts
// npm i dotenv
// npm install mongoose
// npm i bcryptjs
// npm i "@sendgrid/mail"
// npm i express-session
// npm i express-fileupload

const path = require("path");
const express = require("express");
const expressLayouts = require('express-ejs-layouts');
const mongoose = require("mongoose");
const session = require("express-session");
const fileUpload = require("express-fileupload");

// Set up dotenv
const dotenv = require("dotenv");
dotenv.config({ path: "./config/keys.env" });

//Set up express
const app = express();

// Require the mealkit-util module
const mealKitUtil = require('./modules/mealKit-util');

// Make the "assets" folder public (aka Static)
app.use(express.static(path.join(__dirname, "/assets")));



// Set up fileupload
app.use(fileUpload());

// set up EJS
 app.set("view engine", "ejs");
 app.set("layout", "layouts/main");
app.use(expressLayouts);
 
app.set('views', __dirname + '/views');

// set up body-parse
app.use(express.urlencoded({ extended: true }));

// set up express-session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    // save the user to the global variable "locals"
    res.locals.user = req.session.user;
    res.locals.role = req.session.role;
    next();
});



 
// Load the controllers into express
const generalController = require("./controllers/generalController");
const mealKitsController = require("./controllers/mealKitsController");
const loadDataController = require("./controllers/loadDataController");

app.use("/", generalController);
app.use("/mealKits/", mealKitsController);
app.use("/load-data/", loadDataController);

   // Get meal kits grouped by category using the getMealKitsByCategory() function from mealkit-util
   const mealKits = mealKitUtil.getAllMealKits(); 
   const mealKitsByCategory = mealKitUtil.getMealKitsByCategory(mealKits);


// This use() will not allow requests to go beyond it
// so we place it at the end of the file, after the other routes.
// This function will catch all other requests that don't match
// any other route handlers declared before it.
// This means we can use it as a sort of 'catch all' when no route match is found.
// We use this function to handle 404 requests to pages that are not found.
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

// This use() will add an error handler function to
// catch all errors.
app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send("Something broke!")
});


// *** DO NOT MODIFY THE LINES BELOW ***

// Define a port to listen to requests on.
const HTTP_PORT = process.env.PORT || 8080;

// Call this function after the http server starts listening for requests.
function onHttpStart() {
    console.log("Express http server listening on: " + HTTP_PORT);
}

  
// Listen on port 8080. The default port for http is 80, https is 443. We use 8080 here
// because sometimes port 80 is in use by other applications on the machine
//set up moogoose
mongoose.connect(process.env.MONGODB_CNNECTION_STRING)
    .then(() => {
        console.log("Connected to MongoDB database");
        app.listen(HTTP_PORT, onHttpStart);
    })
    .catch(err => {
        console.log(`Can't cnnect to the MongoDB database: ${err}`);
})