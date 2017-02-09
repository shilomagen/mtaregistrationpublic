var User = require('mongoose').model('User'),
	Param = require('mongoose').model('Param'),
	Team = require('mongoose').model('Team'),
	passport = require('passport'),
	nodemailer = require('nodemailer'),
	config = require('../../config/config'),
	ROLES = require('./../models/user.server.model').ROLES,
	Q = require('q');


//Init the SMTP transport
var smtpConfig = {
	host: 'smtp.gmail.com',
	port: 465,
	secure: true, // use SSL
	auth: {
		user: config.emailAddr,
		pass: config.emailPass
	},
	tls: {
		rejectUnauthorized: false
	}
};
var transporter = nodemailer.createTransport(smtpConfig);

function sendContactUsEmail(body) {
	// setup e-mail data with unicode symbols

	var mailOptions = {
		from: body.email, // sender address
		to: config.emailAddr, // list of receivers
		subject: 'Someone contact ' + config.eventname + ' website!', // Subject line
		text: body.message,// plaintext body
		html: '<h1> ' + body.name + '(' + body.email + ')</h1><h2> This is his message:</h2><h3>' + body.message + '</h3>'// html body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
}

function sendGeneralEmail(to, subject, body) {
	var mailOptions = {
		from: config.emailAddr, // sender address
		to: to, // list of receivers
		subject: subject,
		text: body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
}


exports.sendMail = function(req, res, next) {
	sendContactUsEmail(req.body);
	res.send("ok");
};

var getErrorMessage = function(err) {
	var message = '';
	if (err.code) {
		switch (err.code) {
			case 11000:
			case 11001:
				message = 'Username already exists';
				break;
			default:
				message = 'Something went wrong';
		}
	}
	else {
		for (var errName in err.errors) {
			if (err.errors[errName].message)
				message = err.errors[errName].message;
		}
	}

	return message;
};

exports.renderLogin = function(req, res, next) {
	if (!req.user) {
		res.render('index', {
			user: '',
			pageTitle: 'Login',
			menu: [{name: 'Home', path: '/', isActive: true}],
			messages: req.flash('error'),
			eventName: config.eventname,
			footerData:config.eventMediaLinks
		});
	}
	else {
		return res.redirect('/team-up');
	}
};

exports.renderRegister = function(req, res, next) {
	if (!req.user) {
		res.render('register', {
			user: '',
			pageTitle: 'Registration',
			menu: [
				{
					name: 'Home',
					path: '/',
					isActive: false
				},
				{
					name: 'Register',
					path: '/register',
					isActive: true
				}, {
					name: 'Login',
					path: '/login',
					isActive: false
				}],
			messages: req.flash('error'),
			eventName: config.eventname,
			footerData:config.eventMediaLinks
		});
	}
	else {
		return res.redirect('/team-up');
	}
};

// exports.renderForgot = function(req, res, next) {
// 	if (!req.user) {
// 		res.render('forgot', {
// 			title: 'Forgot form',
// 			messages: req.flash('error'),
// 			suppemail: config.supportEmailAddr,
// 			eventname: config.eventname,
// 			eventwebsite: config.eventwebsite,
// 			eventfacebook: config.eventfacebook
// 		});
// 	}
// 	else {
// 		return res.redirect('/team-up');
// 	}
// };

exports.renderPrintUsers = function(req, res, next) {
	//if (!req.user) {
	User.find({}, function(err, users) {
		if (err) {
			return next(err);
		}
		else {
			res.render('showUsers', {
				title: 'Show Users Panel',
				users: users,
				messages: req.flash('error'),
				suppemail: config.supportEmailAddr,
				eventname: config.eventname,
				eventwebsite: config.eventwebsite,
				eventfacebook: config.eventfacebook,
				roles: ROLES,
				footerData:config.eventMediaLinks
			});
		}
	});
	//} else {
	//	return res.redirect('/');
	//}
};

exports.renderAdminspace = function(req, res, next) {

	User.find({}, function(err, users) {
		if (err) {
			return next(err);
		} else {
			Team.count({}, function(err, teamCount) {
				res.render('adminspace', {
					eventName: config.eventname,
					pageTitle: 'Adminspace',
					menu: [
						{
							name: 'Home',
							path: '/',
							isActive: false
						},
						{
							name: 'Adminspace',
							path: '/adminspace',
							isActive: true
						},
						{
							name: 'Logout',
							path: '/logout',
							isActive: false
						}
					],
					usersCount: users.length,
					approvedUsers: howManyUsersApproved(users),
					teamCount: teamCount,
					footerData:config.eventMediaLinks
				});
			});

		}
	});
};

var howManyUsersApproved = function(usersArr) {
	var counter = 0;
	usersArr.forEach(function(user) {
		if (user.accepted) {
			counter++;
		}
	});
	return counter;
};

exports.renderParams = function(req, res, next) {
	Param.find({}, function(err, params) {
		if (err) {
			return next(err);
		}
		else {
			res.render('params', {
				title: 'Manage Parameters',
				params: params,
				messages: req.flash('error'),
				suppemail: config.supportEmailAddr,
				eventname: config.eventname,
				eventwebsite: config.eventwebsite,
				eventfacebook: config.eventfacebook
			});
		}
	});
};

exports.renderReset = function(req, res, next) {
	if (req.user && User.isAdmin(req.user)) {
		res.render('reset', {
			title: 'reset password',
			user: {"email": req.user.email},
			messages: req.flash('error'),
			suppemail: config.supportEmailAddr,
			eventname: config.eventname,
			eventwebsite: config.eventwebsite,
			eventfacebook: config.eventfacebook,
			adminemail: config.adminEmail
		});
	}
	else {
		res.redirect("/login");
	}
};

exports.renderResetme = function(req, res, next) {
	if (!req.user && req.params.resetId) {
		if (req.params.resetId.length > 0) {
			User.findOne({resetPass: req.params.resetId}, function(err, user) {
					if (err) {
						console.log("cant access db to render resetme " + err);
						res.render('resetme',
							{
								pageTitle: 'Reset Password',
								msg: 'error',
								user:{},
								menu: [
									{
										name: 'Home',
										path: '/',
										isActive: false
									},
									{
										name: 'Login',
										path: '/login',
										isActive: false
									}],
								messages: req.flash('error'),
								eventName: config.eventname,
								footerData:config.eventMediaLinks
							});
					}
					else if (!user) {
						res.render('resetme', {
							pageTitle: 'Reset Password',
							msg: 'nouser',
							user:{},
							menu: [
								{
									name: 'Home',
									path: '/',
									isActive: false
								},
								{
									name: 'Login',
									path: '/login',
									isActive: false
								}],
							messages: req.flash('error'),
							eventName: config.eventname,
							footerData:config.eventMediaLinks
						});
					} else {
						res.render('resetme', {
							pageTitle: 'Reset Password',
							msg: 'ok',
							user: {"email": user.email, "resetPass": req.params.resetId},
							menu: [
								{
									name: 'Home',
									path: '/',
									isActive: false
								},
								{
									name: 'Login',
									path: '/login',
									isActive: false
								}],
							messages: req.flash('error'),
							eventName: config.eventname,
							footerData:config.eventMediaLinks
						});
					}
				}
			);
		} else {
			res.render('resetme', {
				pageTitle: 'Reset Password',
				msg: 'wrongid',
				user: {},
				menu: [
					{
						name: 'Home',
						path: '/',
						isActive: false
					},
					{
						name: 'Login',
						path: '/login',
						isActive: false
					}],
				messages: req.flash('error'),
				eventName: config.eventname,
				footerData:config.eventMediaLinks
			});
		}
	}
	else {
		res.redirect("/login");
	}
};

exports.passer = function(req, res, next) {
	console.log(req.body)
	if (!req.body.email || req.body.email === "" || !req.body.resetPass || req.body.resetPass.length == 0) {
		res.send("you did something wrong. try again or contact " + config.emailAddr)
	}
	User.findOne({resetPass: req.body.resetPass}, function(err, user) {
		if (err) {
			res.send("error")
		} else if (!user) {
			res.send("resetidinvalid")
		} else if (user.email !== req.body.email) {
			res.send("emailnomatchlink")
		} else {
			user.resetPass = "";
			user.password = req.body.password;
			user.save(function(err) {
				if (err) {
					console.log("we have update error");
					console.log(err);
					res.send("error")
				} else {
					res.send("ok");
				}
			})
		}
	});

};
exports.forgot = function(req, res, next) {
	console.log(req.body.email);
	var link = Math.random().toString(36).substring(7);
	User.findOneAndUpdate({email: req.body.email}, {resetPass: link}, function(err, user) {
			if (err) {
				console.log(err);
				res.send("ERR");
			}
			else if (!user) {
				console.log("NO USER")
				res.send("NOUSER");
			} else {
				console.log("fine")
				var body = "Hi " + user.first_name + " " + user.last_name +
					"\nPlease follow this link to reset your password\n"
					+ config.eventwebsite + "/resetme/" + link + "\n\n" + config.eventname + " Team";
				sendGeneralEmail(user.email, config.eventname + " account password reset", body);
				res.send("ok")
			}
		}
	);
};
exports.register = function(req, res, next) {
	if (!req.user) {
		var user = new User(req.body);
		var message = null;
		user.provider = 'local';
		user.save(function(err) {
			if (err) {
				console.log(err);
				var message = getErrorMessage(err);
				req.flash('error', message);
				if (err.code === 11000) {
					return res.status(409).json(err.code);
				} else {
					return res.status(500).json(err.code);
				}
			} else {
				var subject = config.eventname + ' Registration';
				var body = "Hi " + user.first_name + " " + user.last_name + "\nYou have successfully registered to "
					+ config.eventname + ".\nPlease user your email and password to login to our team creation " +
					"platform and create or join a team.\n"
					+ config.eventwebsite + "/login\n\n" + config.eventname + " Team";
				sendGeneralEmail(user.email, subject, body);
				res.send("ok")
			}
		});
	}
	else {
		return res.redirect('/');
	}
};

exports.logout = function(req, res) {
	req.logout();
	res.redirect('/team-up');
};

exports.saveOAuthUserProfile = function(req, profile, done) {
	User.findOne({
			provider: profile.provider,
			providerId: profile.providerId
		},
		function(err, user) {
			if (err) {
				return done(err);
			}
			else {
				if (!user) {
					var possibleUsername = profile.username || ((profile.email) ? profile.email.split('@')[0] : '');
					User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
						profile.username = availableUsername;
						user = new User(profile);

						user.save(function(err) {
							if (err) {
								var message = _this.getErrorMessage(err);
								req.flash('error', message);
								return res.redirect('/register');
							}

							return done(err, user);
						});
					});
				}
				else {
					return done(err, user);
				}
			}
		}
	);
};

exports.create = function(req, res, next) {
	var user = new User(req.body);
	user.save(function(err) {
		if (err) {
			return next(err);
		}
		else {
			res.json(user);
		}
	});
};

exports.list = function(req, res, next) {
	User.find({}, '-password', function(err, users) {
		if (err) {
			return next(err);
		}
		else {
			res.json(users);
		}
	});
};

exports.read = function(req, res) {
	var retVal = {"isMember": req.userDetails.isMember, "team": req.userDetails.team}
	res.json(retVal);
};

exports.userByID = function(req, res, next, id) {
	if (id.match(/^[0-9a-fA-F]{24}$/)) {
		//Yes, it's a valid ObjectId, proceed with `findById` call.

		User.findOne({_id: id}, function(err, user) {
				if (err) {
					console.log(err);
					return next(err);
				}
				else if (!user) {
					next("User does not exist");
				} else {
					req.userDetails = user;
					next();
				}
			}
		);
	} else if (id.match(/\S+@\S+\.\S+/)) {
		User.findOne({email: {$regex: new RegExp(id, "i")}}, function(err, user) {
				if (err) {
					console.log(err);
					return next(err);
				}
				else if (!user) {
					next("User with email " + id + " does not exist");
				} else {
					req.userDetails = user;
					next();
				}
			}
		);
	} else {
		res.status(404).json("this is not a valid email");
	}

};

exports.permissionCheck = function(req, res, next) {
	if (req.user) {
		User.findById(req.user._id, function(err, user) {
			if (err) {
				return next(err);
			} else if (User.isAdmin(user)) {
				next();
			} else {
				res.status(401).redirect('/login');
			}
		})
	} else {
		res.status(401).redirect('/login');
	}
};

exports.isUserSuperAdminRole = function(req, res, next) {
	if (req.user) {
		User.findById(req.user._id, function(err, user) {
			if (err) {
				return next(err);
			} else if (user.role === ROLES.SuperAdmin) {
				next();
			} else {
				res.status(401).send({status: false, error: "You're not authorized dude"});
			}
		})
	} else {
		res.status(401).redirect('/login');
	}
}

exports.isUserAdminRole = function(req, res, next) {
	if (req.user) {
		User.findById(req.user._id, function(err, user) {
			if (err) {
				return next(err);
			} else if ((user.role === ROLES.Admin) || (user.role === ROLES.SuperAdmin)) {
				next();
			} else {
				res.status(401).redirect('/login');
			}
		})
	} else {
		res.status(401).redirect('/login');
	}

};

exports.update = function(req, res, next) {
	User.findByIdAndUpdate(req.userDetails._id, req.body, function(err, user) {
		if (err) {
			return next(err);
		}
		else {
			res.json({status: "ok"});
		}
	});
};

exports.updateParam = function(req, res, next) {
	Param.findByIdAndUpdate(req.params.paramId, req.body, function(err, user) {
		if (err) {
			return next(err);
		}
		else {
			res.json({status: "ok"});
		}
	});
};

exports.delete = function(req, res, next) {
	req.user.remove(function(err) {
		if (err) {
			return next(err);
		}
		else {
			res.json(req.user);
		}
	})
};

exports.logedIn = function(req, res, next) {
	if (req.user) {
		next();
	} else {
		res.redirect('/login');
	}
};

exports.userAgree = function(req, res, next) {
	if (req.params.userIdToUpdate) {
		if (req.params.userIdToUpdate.match(/^[0-9a-fA-F]{24}$/)) {
			//Yes, it's a valid ObjectId, proceed with `findById` call.
			User.findByIdAndUpdate({_id: req.params.userIdToUpdate}, {"accepted": true}, function(err, user) {
				if (err) {
					res.status(500).send("<h4>We had an internal error, please try again or contact " + config.emailAddr + "</h4>");
				}
				else if (!user) {
					res.status(400).send("<h4>user token not found, please try again or contact " + config.emailAddr + "</h4>")
				} else {
					var msgToRender = "";
					if (user.accepted) {
						msgToRender = 'You have already RSVP\'d.';
					} else {
						msgToRender = "You have accepted the rules & RSVP'd for the " + config.eventname;
						var subject = config.eventname + ' RSVP confirmation';
						var body = "Hi " + user.first_name + " " + user.last_name +
							"\nYou have accepted the rules and RSVP\'d for the " +
							config.eventname + ".\n\nSee you soon!\n" + config.eventname + " Team";
						sendGeneralEmail(user.email, subject, body);
					}

					res.render('rsvp', {
						messages: req.flash('error') || req.flash('info'),
						name: user.first_name,
						email: user.email,
						msg: msgToRender,
						suppemail: config.supportEmailAddr,
						eventname: config.eventname,
						eventwebsite: config.eventwebsite,
						eventfacebook: config.eventfacebook
					});
				}

			});
			//invalid object token
		} else {
			res.status(400).send("<h4>user token not valid, please try again or contact " + config.supportEmailAddr + "</h4>")
		}
	} else {
		res.status(400).send("<h4>no user token was sent, please try again or contact " + config.supportEmailAddr + "</h4>")
	}
};

exports.isInTeam = function(req, res, next) {
	var user = req.user;
	if (user.team.length > 0) {
		res.status(500).send('already in a team');
	} else {
		next();
	}
};

exports.searchUserByEmailAutocomplete = function(req, res) {
	var regex = new RegExp(req.query["term"], 'i');
	var query = User.find({'email': regex}, {'_id': 1, 'email': 1});
	query.exec(function(err, users) {
		if (err) {
			res.status(401).send(JSON.stringify(err));
		} else {
			res.json(users);
		}
	});
};

exports.leaveTeam = function(req, res) {
	var teamId = req.user.team;
	if (!teamId) {
		res.status(400).send("User not in a group");
	} else {
		User.findOneAndUpdate({_id: req.user._id}, {isMember: false, team: ''}, function(err, user) {
			if (err) {
				res.status(500).send(err);
			} else {
				Team.removeUserFromGroup(user, teamId)
					.then(function(team) {
						console.log(req.user.email + " Was deleted from group " + team.team_name);
						res.send(req.user.email + " Was deleted from group " + team.team_name);
					})
					.catch(function(e) {
						res.status(400).send(e);
					})
					.done();
			}
		});
	}
};






