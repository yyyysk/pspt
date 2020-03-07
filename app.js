const express = require('express');
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const flash = require('connect-flash');
const passport = require('passport');
const request = require('request');
const session = require('express-session');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
const expressSession = require('express-session');
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());

app.use('/public', express.static(__dirname + '/public'));
app.use(flash());
app.use(session({ secret: 'keyboard cat' }));
app.use(bodyParser());
app.set('view engine', 'pug');
app.set('view options', { layout: false });

require('./lib/routes.js')(app);

app.listen(PORT);
