const express = require('express');
const app = express();
const passport = require('passport');
const request = require('request');
const { Pool, Client } = require('pg');
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const LocalStrategy = require('passport-local').Strategy;
const currentAccountsData = [];
const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT,
	ssl: true
});

module.exports = function(app) {
	
	// public
	app.use(express.static('public'));
	
	// home
	app.get('/', (req, res, next) => {
		res.render('index', {
			title: 'Home', 
			userData: req.user,
			messages: {
				danger: req.flash('danger'),
				warning: req.flash('warning'),
				success: req.flash('success')
			}
		});
	
		console.log(req.user);
	});
	
	// register(join)
	app.get('/join', (req, res, next) => {
		res.render('join', {
			title: 'Join', 
			userData: req.user,
			messages: {
				danger: req.flash('danger'),
				warning: req.flash('warning'),
				success: req.flash('success')
			}
		});
	});
	
	app.post('/join', async (req, res) => {
		try {
			const client = await pool.connect();
			await client.query('BEGIN');
			const pwd = await bcrypt.hash(req.body.password, 5);
			await JSON.stringify(
				client.query(`SELECT id FROM "users" WHERE "email"=$1`,
					[req.body.username],
					(err, result) => {
						if (result.rows[0]) {
							req.flash(
								'warning', 
								"This email address is already registered. <a href='/join'>Log in!</a>",
								res.redirect('/join')
							);
						} else {
							client.query(`INSERT INTO users 
															(id, "firstName", "lastName", email, password)
															VALUES ($1, $2, $3, $4, $5)`,
														[uuidv4(), req.body.firstName, req.body.lastName, req.body.username, pwd],
								(err, result) => {
									if (err) console.log(err);
									else {
										client.query('COMMIT');
										console.log(result);
										req.flash('success', 'User created.');
										res.redirect('/login');
										return;
									}
								});
						}
					}));
			client.release();
		} catch (e) {
			throw(e);
		}
	});
	
	// account
	app.get('/account', (req, res, next) => {
		if (req.isAuthenticated()) {
			res.render('account', {
				title: 'Account',
				userData: req.user,
				messages: {
					danger: req.flash('danger'),
					warning: req.flash('warning'),
					success: req.flash('success')
				}
			});
		} else {
			res.redirect('/login');
		}
	});
	
	// login
	app.get('/login', function(req, res, next) {
		if (req.isAuthenticated()) {
			res.redirect('/account');
		} else {
			res.render('login', {
				title: 'Account',
				userData: req.user,
				messages: {
					danger: req.flash('danger'),
					warning: req.flash('warning'),
					success: req.flash('success')
				}
			});
		}
	});
	
	app.post('/login', passport.authenticate('local', {
		successRedirect: '/account',
		failureredirect: '/login',
		failureFlash: true
	}), (req, res) => {
		if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
		} else {
			req.session.cookie.expires = false;
		}
		res.redirect('/');
	});
	
	// logout
	app.get('/logout', (req, res) => {
		console.log(req.isAuthenticated());
		req.logout();
		console.log(req.isAuthenticated());
		req.flash('success', 'Logged out. See you soon!');
		res.redirect('/');
	});
	
	
	passport.use('local', new LocalStrategy({
		passReqToCallback: true
	}, (req, username, password, done) => {
		loginAttempt();
		async function loginAttempt() {
			try {
				await client.query('BEGIN');
				const currentAccountsData = await JSON.stringify(
					client.query(
						'SELECT id, "firstName", "email", "password" FROM "users" WHERE "email"=$1',
						[username],
						(err, result) => {
							if (err) return done(err);
							if (result.row[0] === null) {
								req.flash('danger', "Oops. Incorrect login details.");
								return done(null, false);
							} else {
								bcrypt.compare(password, result.rows[0].password, (err, check) => {
									if (err) {
										console.log('Error while checking password');
										return done();
									} else if (check) {
										return done(null, [{email: result.rows[0].email, firstName: result.rows[0].firstName}]);
									} else {
										req.flash('danger', "Oops. Incorrect login details");
										return done(null, false);
									}
								});
							}
						})
				);
			} catch(e) {
				throw(e);
			}
		}
	}));
	
	passport.serializeUser((user, done) => done(null, user));
	passport.deserializeUser((user, done) => done(null, user));
};	
