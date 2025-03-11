const express = require('express');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/users');
const Product = require('../models/Product'); // Adjust the path according to your project structure
const connectDB = require('../models/db');
const Cart = require('../models/Cart');
const checkAdmin = require('../middleware/checkAdmin');
const Razorpay = require('razorpay');

// Initialize the Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_qwUWbYhsbam1oJ',
    key_secret: 'NKuKFl5Q2PcW5poRLqXNaqOE',
});

// Connect to MongoDB
connectDB();


// Middleware to check if user is logged in
function checkIfLoggedIn(req, res, next) {
    if (req.session && req.session.user) {
        return res.redirect('/'); // Redirect to the homepage or dashboard if logged in
    }
    next(); // Continue to login/register page if not logged in
}




/* GET home page. */
router.get('/', (req, res) => {
    const user = (req.session && req.session.user) ? req.session.user : null;
    res.render('index', { user });
});

/* GET about page. */
router.get('/about', (req, res) => {
    const user = (req.session && req.session.user) ? req.session.user : null;
    res.render('about', { user });
});

/* GET login page. */
router.get('/login',checkIfLoggedIn,  (req, res) => {
    const user = (req.session && req.session.user) ? req.session.user : null;
    res.render('login', { user });
});

/* GET registration page. */
router.get('/register', checkIfLoggedIn, (req, res) => {
    const user = (req.session && req.session.user) ? req.session.user : null;
    res.render('register', { user });
});

// Route to get products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find(); // Fetch products from your database
        const user = (req.session && req.session.user) ? req.session.user : null; // Get the current user from session
        res.render('products', { products, user }); // Pass user to the template
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



// const bcrypt = require('bcrypt');

// Function to create an admin user
async function createAdminUser() {
    const adminEmail = 'admin@example.com'; // Replace with your desired admin email
    const adminPassword = 'adminPassword'; // Replace with a secure password
    const adminUsername = 'Admin'; // Admin username

    // Check if the admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = new User({
            username: adminUsername,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created:', adminEmail);
    } else {
        console.log('Admin user already exists:', adminEmail);
    }
}

// Call the function to create an admin user
createAdminUser().catch(console.error);







// Admin dashboard
router.get('/admin', checkAdmin, async (req, res) => {
    try {
        const users = await User.find(); // Get all users
        const products = await Product.find(); // Get all products
        const user = req.session.user; // Current logged-in user (admin)
        res.render('admin', { users, products, user }); // Render admin dashboard
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add, Update, Delete users logic
// Add user
router.post('/admin/add-user', checkAdmin, async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role });
        await newUser.save();
        res.redirect('/admin'); // Redirect to admin page
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update user
router.post('/admin/update-user/:id', checkAdmin, async (req, res) => {
    const { username, email, role } = req.body;
    try {
        await User.findByIdAndUpdate(req.params.id, { username, email, role });
        res.redirect('/admin');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete user
router.post('/admin/delete-user/:id', checkAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Assuming you have a route for the cart
// Route to display the cart
router.get('/cart', async (req, res) => {
    const cart = req.session.cart || { products: [] }; // If cart does not exist, create an empty one
    const user = req.session.user || null;

    // Fetch full product details from the database based on productId in the cart
    const cartWithDetails = await Promise.all(
        cart.products.map(async (cartItem) => {
            const product = await Product.findById(cartItem.productId); // Fetch the full product details
            return {
                ...cartItem,
                productName: product.name,
                productPrice: product.price,
                productImage: product.imageUrl, // Assuming the product model has an 'imageUrl' field
            };
        })
    );

    // Render the cart page with full product details
    res.render('carts', { cart: { products: cartWithDetails }, user });
});




// const mongoose = require('mongoose');

router.post('/cart/add', async (req, res) => {
    const productId = req.body.productId;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Initialize cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = { products: [] };
        }

        const cartProductIndex = req.session.cart.products.findIndex(p =>
             p.productId.toString() === productId.toString());

        if (cartProductIndex > -1) {
            req.session.cart.products[cartProductIndex].quantity += 1; // Update quantity
        } else {
            req.session.cart.products.push({
                productId,
                quantity: 1,
                productName: product.name,
                productPrice: product.price,
                productImage: product.imageUrl // Make sure the field matches your Product model
            });
        }

        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});












router.post('/cart/update-quantity/:productId', (req, res) => {
    const productId = req.params.productId;

    // Ensure the cart is fetched correctly from the session
    let cart = req.session.cart;

    if (!cart) {
        return res.status(400).send('Cart not found'); // You might want to redirect to an error page instead
    }

    let productIndex = cart.products.findIndex(p => p.productId.toString() === productId.toString());

    if (productIndex !== -1) {
        // Parse newQuantity to an integer
        const newQuantity = parseInt(req.body.newQuantity, 10);

        if (isNaN(newQuantity) || newQuantity < 1) {
            return res.status(400).send('Invalid quantity'); // You might want to handle this differently
        }

        // Update the quantity
        cart.products[productIndex].quantity = newQuantity;
        req.session.cart = cart; // Save updated cart back to session

        // Redirect to the cart page
        res.redirect('/cart');
    } else {
        return res.status(404).send('Product not found in cart'); // You might want to redirect to the cart page instead
    }
});



// Define the removeItemFromCart function
async function removeItemFromCart(itemId) {
    try {
        const result = await Cart.findOneAndUpdate(
            { "items._id": itemId },   // Find the cart item by ID
            { $pull: { items: { _id: itemId } } },  // Remove the item from the array
            { new: true }
        );
        return result;
    } catch (error) {
        console.error('Error removing item from cart:', error);
        throw error;
    }
}

router.post('/cart/remove/:productId', (req, res) => {
    const productId = req.params.productId;

    // Ensure the cart is fetched correctly from the session
    let cart = req.session.cart;

    // Check if the cart exists
    if (!cart) {
        // If the cart is not found, redirect to an error page or send an error response
        return res.status(400).send('Cart not found');
    }

    // Find the index of the product to be removed
    let productIndex = cart.products.findIndex(p => p.productId.toString() === productId.toString());

    // Check if the product exists in the cart
    if (productIndex !== -1) {
        // Remove the product from the cart
        cart.products.splice(productIndex, 1);

        // Save the updated cart back to the session
        req.session.cart = cart;

        // Redirect back to the cart page with a success message (optional)
        res.redirect('/cart');
    } else {
        // If the product is not found in the cart, return an error response
        return res.status(404).send('Product not found in cart');
    }
});

  



// Checkout route
router.get('/checkout', async (req, res) => {
    const user = req.session.user; // Assuming you're storing user in session

    if (!user) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }

    // Retrieve cart details from the session
    const cart = req.session.cart || { products: [] };

    // Calculate total amount and prepare product details
    let totalAmount = 0;
    const cartItems = cart.products.map(item => {
        const itemTotal = item.productPrice * item.quantity; // Calculate item total
        totalAmount += itemTotal; // Add item total to total amount
        return {
            name: item.productName, // Assuming each item has a 'productName'
            price: item.productPrice,
            quantity: item.quantity,
            total: itemTotal,
        };
    });

    // Render the checkout page
    res.render('checkout', { user, totalAmount: totalAmount * 100, cartItems }); // Total amount is in paise
});

// Route for creating Razorpay order
router.post('/create-order', async (req, res) => {
    const { amount } = req.body;

    // Create Razorpay order options
    const options = {
        amount: amount, // Amount is in paise (multiply INR by 100)
        currency: 'INR',
        receipt: `order_rcptid_${Date.now()}`, // Unique receipt ID
    };

    try {
        // Create the order on Razorpay
        const order = await razorpayInstance.orders.create(options);
        res.json(order); // Send order details back to the frontend
    } catch (err) {
        console.error('Error creating Razorpay order:', err);
        res.status(500).json({ error: 'Error creating order. Please try again later.' });
    }
});

// Route for handling successful payment
router.post('/order-success', async (req, res) => {
    const { orderId, paymentId, signature } = req.body;
    const user = req.session.user; // Get the logged-in user
    const cart = req.session.cart || { products: [] };

    try {
        // Signature verification using Razorpay
        const crypto = require('crypto');
        const generatedSignature = crypto.createHmac('sha256', 'YOUR_RAZORPAY_SECRET')
            .update(orderId + "|" + paymentId)
            .digest('hex');

        if (generatedSignature !== signature) {
            return res.status(400).json({ error: 'Payment verification failed!' });
        }

        // Example of creating an order record in your database
        const newOrder = {
            userId: user._id,
            products: cart.products,
            totalAmount: cart.products.reduce((total, item) => total + item.productPrice * item.quantity, 0),
            orderId,
            paymentId,
            signature,
            status: 'Paid', // Payment is verified and successful
        };

        // Save the order to the database (you need an Order model)
        await Order.create(newOrder);

        // Clear the cart after successful order creation
        req.session.cart = { products: [] }; // Reset the cart to empty
        req.session.save(err => {
            if (err) {
                console.error('Error clearing cart:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            // Redirect to order success page after clearing the cart
            res.redirect('/order-success');
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Route for displaying order success page
router.get('/order-success', (req, res) => {
    const user = req.session.user;
    res.render('order-success', { user }); // Render order success page
});
















// Login route
router.post('/login',async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            };

            if (user.role === 'admin') {
                res.redirect('/admin'); // Redirect to admin dashboard if admin logs in
            } else {
                res.redirect('/'); // Redirect to home page for normal users
            }
        } else {
            res.status(400).render('login', { error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Registration route
router.post('/register',  async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Render the registration page with an error message
            return res.status(400).render('register', { errorMessage: 'Email is already registered' });
        }

        // Hash the password and create a new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        // Redirect to login page after successful registration
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);

        // Check for duplicate email error (MongoDB error code 11000)
        if (error.code === 11000) {
            return res.status(400).render('register', { errorMessage: 'Email is already registered' });
        }

        // If it's a different error, return a generic error message
        res.status(500).send('Internal Server Error');
    }
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/');
        }
        res.redirect('/'); // Redirect to home page after logout
    });
});







// Route to render the add-product page
router.get('/add-product', async (req, res) => {
    try {
        const products = await Product.find(); // Fetch all products from the database
        const user = req.session.user; // Get user info from session
        res.render('add-product', { products, user }); // Pass products and user to the EJS template
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// Handle adding a product
router.post('/add-product', async (req, res) => {
    const { name, price, description, imageUrl } = req.body;

    // Basic validation
    if (!name || !price || !description || !imageUrl) {
        return res.status(400).render('add-product', {
            errorMessage: 'All fields are required',
            products: await Product.find() // Fetch products again for the EJS template
        });
    }

    try {
        const newProduct = new Product({ name, price, description, imageUrl });
        await newProduct.save();
        res.redirect('/products'); // Redirect to the products page after successful addition
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update a product
router.post('/update-product/:id', async (req, res) => {
    const { name, price, description, imageUrl } = req.body;
    try {
        await Product.findByIdAndUpdate(req.params.id, { name, price, description, imageUrl });
        res.redirect('/add-product'); // Redirect back to the add-product page
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Route to delete a product
router.post('/delete-product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/add-product'); // Redirect back to the add-product page
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});










module.exports = router;
