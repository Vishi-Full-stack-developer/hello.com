// Import required modules
var createError = require('http-errors'); // Module for creating HTTP errors
var express = require('express'); // Main express module for handling HTTP requests
var session = require('express-session');
var path = require('path'); // Module for handling file and directory paths
var cookieParser = require('cookie-parser'); // Middleware for parsing cookies
var logger = require('morgan'); // HTTP request logger middleware

// Importing the route handlers
var indexRouter = require('./routes/index'); // Router for handling index-related routes
var usersRouter = require('./models/users'); // Router for handling user-related routes

var app = express(); // Create an Express application



app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views')); // Set the directory where views (EJS templates) are located
app.set('view engine', 'ejs'); // Set EJS as the templating engine

// Middleware setup
app.use(logger('dev')); // Use morgan for logging requests in the 'dev' format
app.use(express.json()); // Middleware for parsing JSON request bodies
app.use(express.urlencoded({ extended: false })); // Middleware for parsing URL-encoded request bodies
app.use(cookieParser()); // Middleware for parsing cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// Routing setup
app.use('/', indexRouter); // Use the index router for handling requests to the root URL
app.use('/users', usersRouter); // Use the users router for handling requests to the /users URL

// Catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404)); // Create a 404 error if no route matches
});

// Error handler middleware
app.use(function(err, req, res, next) {
  // Set locals to provide error information for rendering
  res.locals.message = err.message; // Set the error message
  res.locals.error = req.app.get('env') === 'development' ? err : {}; // Provide error details only in development mode

  // Render the error page with the appropriate status code
  res.status(err.status || 500); // Set the response status to the error's status or 500 if none exists
  res.render('error'); // Render the error.ejs view
});

// Export the app module
module.exports = app;
