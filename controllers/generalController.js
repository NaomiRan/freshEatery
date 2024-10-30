const mealKitUtil = require("../modules/mealKit-util");
const express = require('express');
const router = express.Router();

const userModel = require("../models/userModel");
const bcryptjs = require("bcryptjs");
const mealKitModel = require("../models/loadDataModel");


//  used on the home page to display the featured meal kits
function getFeaturedMealKits (mealKits) {
    let filtered = [];
    for (let i = 0; i < mealKits.length; i++) {
        if (mealKits[i].featuredMealKit) {
            filtered.push(mealKits[i]);
        }
    }
    return filtered;
};


// Setup a home page route
router.get("/", (req, res) => {
    mealKitModel.find()
        .then(data => {
            // Convert Mongoose documents to plain JavaScript objects
            const mealKitsList = data.map(value => value.toObject());

            // Group meal kits by category
            const mealKits = getFeaturedMealKits(mealKitsList);

            res.render("general/home", {
                mealKits,
                // variable used in main.ejs
                title: "Home Page",
                css: "/css/home.css"
            });
        })
        .catch(err => {
            console.log("No featured mealKit in the database" + err);
            res.render("general/error", {
                title: "Error page",
                message:"The area is empty"
            });

        });
});


router.get("/welcome", (req, res) => {
    res.render("general/welcome", {
        title: "welcome"
    });
});


router.get("/sign-up", (req, res) => {
    res.render("general/sign-up", {
        title: "Register Page",
        validationSignUpMessage: {},
        values: {
            firstName: "",
            lastName: "",
            email: "",
            password: ""
        }
    });
})

router.post("/sign-up", (req, res) => {
    let { firstName, lastName, email, password } = req.body;
    // validate input
    let validationSignUpPassed = true;
    let validationSignUpMessage = {};
    // validate first name (not null and not empty)
    if (typeof (firstName) !== "string") {
        validationSignUpPassed = false;
        validationSignUpMessage.firstName = "Please enter your first name";
    }
    else if (firstName.trim().length === 0 || firstName === "" || firstName === null) {
        validationSignUpMessage.firstName = "first name must contain at least 1 character";
        validationSignUpPassed = false;
    }
    // validate last name (not null and not empty)
    if (typeof (lastName) !== "string") {
        validationSignUpPassed = false;
        validationSignUpMessage.lastName = "Please enter your last name";
    }
    else if (lastName.trim().length === 0 || lastName === "" || lastName === null) {
        validationSignUpMessage.lastName = "last name must contain at least 1 character";
        validationSignUpPassed = false;
    }
    
    //validate email (regular expression)
    const regExp = /^[A-Za-z0-9_!#$%&'*+\/=?`{|}~^.-]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/gm;
    if (typeof (email) !== "string") {
        validationSignUpPassed = false;
        validationSignUpMessage.email = "email is required";
    }
    else if (email.trim().length === 0 || email === null) {
        validationSignUpPassed = false;
        validationSignUpMessage.email = "email must contain at least 1 character";
    }
    else if (!regExp.test(email)) {
        validationSignUpPassed = false;
        validationSignUpMessage.email = "invalid email address";
    }
    //validate password (length is 8-12 and at least one character,one digit, one symbol)
    const passwordReg = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\$@#%^&*()\\[\]{}|\\/~`!?"';:_]){8,12}/g;
   
    if (password === null) {
        validationSignUpPassed = false;
        validationSignUpMessage.password = "password is required";
    }
    else if (password.trim().length === 0) {
        validationSignUpPassed = false;
        validationSignUpMessage.password = "password must contain at least 1 character";
    }
    else if (!passwordReg.test(password)) {
        validationSignUpPassed = false;
        validationSignUpMessage.password = "a password contains 8 to 12 characters at least one lowercase letter, uppercase letter, number and a symbol";
    }
// if passing validate testing, then
    // Check if the email already exists in the database 
    if (validationSignUpPassed) {
        userModel.findOne({
            email: req.body.email
        })
            .then(existingUser => {
                if (existingUser) {
                    // If user already exists, display error message
                    return res.render("general/sign-up", {
                        title: "Register Page",
                        validationSignUpMessage: {
                            email: "Email address already in the user database."
                        },
                        values: req.body
                    });
                }
                else {
                    // no existing user, then a newUser is created
                    const newUser = new userModel({ firstName, lastName, email, password });
                    // save to the database
                    // add bcryptjs in "userModel" will encode the password
                    newUser.save()
                        .then(userSaved => {
                            console.log(`User ${userSaved.firstName} has been added to the database.`);
                            // set up email
                            const sgMail = require("@sendgrid/mail");
                            sgMail.setApiKey(process.env.SEND_GRID_API_KEY);
                            // construct an email structure
                            const msg = {
                                to: email,
                                from: "naomiran1989@gmail.com",
                                subject: "Welcome to registrate",
                                html: `Hi, ${firstName} ${lastName}, congratulations on becoming a member of Fresh Eatery<br>
                            Your Email Address: ${email}<br>
                            Student Name: Dongqin Ran <br>`
                            };
                            // send the email
                            sgMail.send(msg)
                                .then(() => {
                                    console.log(`${firstName}`);
                                    // Redirect to welcome page after sending email
                                    res.redirect("/welcome");

                                })
                                .catch(err => {
                                    console.error(err);
                                    res.render("general/sign-up", {
                                        title: "register page",
                                        validationSignUpMessage,
                                        values: req.body
                                    });
                                });
                        })
                        .catch(err => {
                            console.error(`Error adding user to the database: ${err}`);
                            res.render("general/sign-up");
                        });
                }
            })
            .catch(err => {
                console.error(`Error finding user in the database: ${err}`);
                res.render("general/sign-up");
            });
    }
});


// set up route for login page
router.get("/log-in", (req, res) => {
    res.render("general/log-in", {
        title: "Login page",
        validationMessage: {},
        errors: [],
        values: {
            email: "",
            password: "",
            role:""
        }  
    });
});

// Login Route
router.post("/log-in", (req, res) => {
    const { email, password, role } = req.body;
  
    let validated = true;
    let validationMessage = {};

    if (typeof (email) !== "string" || email.trim().length === 0 || email===null) {
        validated = false;
        validationMessage.email = "You must enter one email address";
    }
   else if (email.trim().length < 2) {
        validated = false;
        validationMessage.email = "Email address has at least 1 character";
    }
    if (password.trim().length === 0 || password===null) {
        validated = false;
        validationMessage.password = "password is required";
    }
    
    if (validated) {

    let errors = [];
    userModel.findOne({ email })
        .then(user => {
            if (user) {
                bcryptjs.compare(password, user.password)
                    .then(matched => {
                        if (matched) {
                            req.session.user = user;
                            req.session.role = role;
                            console.log(`"${role}"`);

                            if (role === "data entry clerk") {
                                res.redirect("mealKits/list");
                            } else if (role === "customer") {
                                 res.redirect("/cart");
                                 
                            } else {
                                 res.status(400).render("general/log-in", {
                                    title: "Login page",
                                    validationMessage: validationMessage,
                                    errors: ["Invalid role specified."],
                                    values: req.body
                                });
                            }
                        } else {
                            return res.status(400).render("general/log-in", {
                                title: "Login page",
                                validationMessage: validationMessage,
                                errors: ["Invalid email or password."],
                                values: req.body
                            });
                        }
                    })
                    .catch(err => {
                        console.log("Password comparison error:", err);
                        return res.status(500).render("general/log-in", {
                            title: "Login page",
                            validationMessage: validationMessage,
                            errors: ["Internal server error."],
                            values: req.body
                        });
                    });
            } else {
                return res.status(400).render("general/log-in", {
                    title: "Login page",
                    validationMessage: validationMessage,
                    errors: ["Invalid email or password."],
                    values: req.body
                });
            }
        })
        .catch(err => {
            console.log("User search error:", err);
            return res.status(500).render("general/log-in", {
                title: "Login page",
                validationMessage: validationMessage,
                errors: ["Internal server error."],
                values: req.body
            });
        });
    }else {
        res.render("general/log-in", {
            title: "Login Page",
            validationMessage,
            values:req.body
        });
    } 
});




// Route to the logout page
router.get("/log-out", (req, res) => {

    // Clear the session from memory.
    req.session.destroy();

    // Do NOT do this since more than one variable is existed
    //req.session.user = null;

    // redirect to home page
    res.redirect("/");
});



// Define a function to prepare the view model and render the page.
const prepareView = function (req, res, message) {
    let viewModel = {
        message,
        hasMealKits: false,
        cartTotal: 0,
        mealKits: []
    };

    if (req.session && req.session.user) {
        // The user is logged in (and a session is established);

        // Get the shopping cart from the session.
        let cart = req.session.cart || [];

        // Check if the cart has mealKits.
        viewModel.hasMealKits = cart.length > 0;

        // Calculate the order total.
        let cartTotal = 0;

        cart.forEach(cartMealKit => {
            cartTotal += cartMealKit.mealKit.price * cartMealKit.qty;
        });

        viewModel.cartTotal = cartTotal;

        // Add the mealKits to the view model.
        viewModel.mealKits = cart;
    }

     res.render("general/cart", viewModel);
    
}

// Setup a route to cart page
router.get("/cart", (req, res) => {
    if (req.session.role === "customer") {
        message = "";
        prepareView(req, res,message);
    } else {
        res.status(401).render("general/error", {
            title: "Unauthorized",
            message: "Sorry, you have no authority to access this page."
        });
    }
});

// Route to add a mealKit.
router.get("/add-mealKit/:id", (req, res) => {

    let message;

    // Parse the ID of the mealKit.
    const mealKitId = req.params.id;

    // Check if the user is logged in.
    if (req.session.user && req.session.role == "customer") {
        // The user is logged in.

        // Make sure the shopping cart exists and if not
        // add a new empty array to the session.
        let cart = req.session.cart = req.session.cart || [];

        // A shopping cart object will look like this:
        //    id: The ID of the mealKit (number)
        //    qty: The number of licenses to purchase (number)
        //    mealKit: The details about the mealKit (for displaying in the cart)

       
        // Find a mealKit from database.
        mealKitModel.findOne({ _id: mealKitId })
            .then(mealKit => {
                console.log("here");
                if (!mealKit) {
                    message = "The mealKit is not found in the database.";
                    prepareView(req,res,message);
                    return;
                }
                // The mealKit was found in the database.

                // Search the shopping cart to see if the mealKit is already added.
                let found = false;

                cart.forEach(cartMealKit => {
                    if (cartMealKit.id === mealKitId) {
                        // The mealKit already exists in the shopping cart.
                        found = true;
                        cartMealKit.qty++;
                    }
                });

                if (found) {
                    // mealKit was found in the cart, we already incremented the quantity.
                    message = `The mealKit "${mealKit.title}" was already in the cart, incremented the quantity.`;
                }
                else {
                    // mealKit was not in the cart, add it.
                    cart.push({
                        id: mealKitId,
                        qty: 1,
                        mealKit
                    });

                    // Add logic to sort the cart (by title).
                    cart.sort((a, b) => a.mealKit.title.localeCompare(b.mealKit.title));

                    message = `The mealKit "${mealKit.title}" was added to the cart.`;
                }
                prepareView(req, res, message);
      
            })
            .catch(() => {
                message = "The mealKit is not found in the database.";
                prepareView(req,res,message);

            });
    } else {
          // The user is not logged in.
        message = "You must be logged in.";
        prepareView(req,res,message);
    }
   
});


router.post("/update-quantity/:id", (req,res)=> {
    const id = req.params.id;
    const qty = req.body.qty;
    if (!req.session.cart) {
        req.session.cart = [];
    }
    req.session.cart.forEach(cartMealKit => {
        if (cartMealKit.id === id) {
            cartMealKit.qty = qty;
        }
    })
    message = "";
    prepareView(req,res,message);
})


router.get("/remove-mealkit/:id", (req, res) => {

    const id = req.params.id;

    if (!req.session.cart) {
        req.session.cart = [];
    }
    for (let i = 0; i < req.session.cart.length; i++) {

        if (req.session.cart[i].id === id) {

            req.session.cart.splice(i, 1);
        }
    }
    message = "";
    prepareView(req, res, message);
})

const generateOrderDetails = function(cart) {
    
    let orderItemsHtml = "";
    let subtotal = 0,tax=0,grandTotal=0;

    cart.forEach(m => {

         subtotal += m.qty * m.mealKit.price;
         tax += subtotal * 0.1;
         grandTotal += subtotal + tax;

        orderItemsHtml += `
            <tr>
                <td>${m.mealKit.title}</td>
                <td>${m.mealKit.includes}</td>
                <td>${m.mealKit.price}</td>
                <td>${m.qty}</td>
               
            </tr>
            `
        });
        orderItemsHtml +=` <tr>
            <td colspan="3" style="border: 0;" align="right">Subtotal &nbsp</td>
            <td>${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="3" style="border: 0;" align="right">Tax</td>
            <td>${tax.toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="3" style="border: 0;" align="right">GrandTotal</td>
            <td>${grandTotal.toFixed(2)}</td>
        </tr>
        `
   
    return `
        <div>
            <h1>Thank you to order in Fresh Eatery!</h1>
            <p>Here are the details of your order:</p>
            <table border="1" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Includes</th>
                        <th>Price</th>
                        <th>Quantity</th>
                       
                    </tr>  
                </thead>
                <tbody>
                    ${orderItemsHtml}
                </tbody>
            </table>
        </div>
    `;
}
router.get("/check-out", (req, res) => {

    //send email
    if (req.session.user && req.session.role === "customer") {

        if (req.session.cart && req.session.cart.length > 0) {

            const sgMail = require("@sendgrid/mail");
            sgMail.setApiKey(process.env.SEND_GRID_API_KEY);
            
            const msg = {
                to: req.session.user.email,
                from: "naomiran1989@gmail.com",
                subject: "Your order has been confirmed",
                html:
                    generateOrderDetails(req.session.cart)
            };
            sgMail.send(msg)
                .then(() => {
                    console.log("Order email has been sent to customer successfully!");
                    req.session.cart = [];
                    let message = "Your order has been confirmed.";
                    prepareView(req, res, message);
                })
                .catch(err => {
                    console.error(err);
                    let message = "Fail to send order confirmation email.";
                    prepareView(req, res, message);
                });
            
        }
        else {
            message = "Your shopping cart is empty.";
            prepareView(req, res, message);
        }
    }
    else {
        message = "You must be logged in.";
        prepareView(req, res, message);
    }

});


module.exports = router;

