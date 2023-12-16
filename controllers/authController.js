const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModule');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  // Remove the Password
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // For Sending Email when you signup
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) If email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if users exsits && password is corrcet
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorect email or password', 401));
  }

  // 3) If everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 100),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting the Token and check if it there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } //else if (req.cookies.jwt) {
  //   token = req.cookies.jwt;
  // }
  else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
  }
  if (!token) {
    res.redirect('/');
    return next(
      new AppError('You are not Logged!! Please log in to get access', 401),
    );
  }
  //2) Verification Token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if users still exsits

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("the user belonging to the token doesn't exsists", 401),
    );
  }

  // 4) Check If user change Password after the token is issued

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently cahnged the password, Please login again',
        401,
      ),
    );
  }
  // Grant Access to protected route.
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for Rendered page and there will be no error
exports.isLoggedIn = async (req, res, next) => {
  // 1) Getting the Token and check if it there
  try {
    if (req.cookies.jwt) {
      // Verfy the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if users still exsits

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check If user change Password after the token is issued

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // There is a looged in user
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    return next();
  }
  next();
};

// Middleware function to restrict certain routes and only few can authorize, not for all

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have permission to perform the action', 403),
      );
    }
    next();
  };
};

// Reset Password

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on Posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('No User find with this email address', 404));

  // 2) Genrate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) send it to user's mail
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'sucess',
      message: 'Token sent to mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending an email, Pleas try again later!!',
      ),
      500,
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on Token

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  console.log(user);
  // 2) If Token has not expired, and there is user, set the new Password
  if (!user) {
    return next(new AppError('Token is invalid or Expired!!', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get User from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    //req.user.id is assumed to be the ID of the currently authenticated user(authController.protection). This information is typically added to the request object during the authentication process.
    return next(new AppError('Your curret password is wrong, 404'));
  }

  //3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // user.findByIdUpdate will not work as intended
  //4) Log user in. send JWT
  createSendToken(user, 200, res);
});
