const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');
const logger = require('../utils/logger');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password_hash'] }
    });

    if (!user) {
      return done(null, false, { message: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return done(null, false, { message: 'Account temporarily locked' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return done(null, false, { message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    if (user.login_attempts > 0) {
      await user.update({
        login_attempts: 0,
        lock_until: null
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/v1/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      logger.info(`Google OAuth attempt for user: ${profile.emails[0].value}`);

      // Check if user already exists with Google ID
      let user = await User.findOne({
        where: { google_id: profile.id }
      });

      if (user) {
        // Update tokens
        await user.updateOAuthTokens(accessToken, refreshToken);
        logger.info(`Existing Google user logged in: ${user.email}`);
        return done(null, user);
      }

      // Check if user exists with same email
      user = await User.findOne({
        where: { email: profile.emails[0].value }
      });

      if (user) {
        // Link Google account to existing user
        await user.update({
          google_id: profile.id,
          oauth_provider: 'google',
          avatar_url: profile.photos[0].value,
          email_verified: profile.emails[0].verified,
          oauth_access_token: accessToken,
          oauth_refresh_token: refreshToken
        });
        logger.info(`Google account linked to existing user: ${user.email}`);
        return done(null, user);
      }

      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        google_id: profile.id,
        oauth_provider: 'google',
        avatar_url: profile.photos[0].value,
        email_verified: profile.emails[0].verified,
        oauth_access_token: accessToken,
        oauth_refresh_token: refreshToken,
        role_id: 1 // Default role
      });

      logger.info(`New Google user created: ${user.email}`);
      return done(null, user);
    } catch (error) {
      logger.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  logger.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/api/v1/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'photos', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      logger.info(`Facebook OAuth attempt for user: ${profile.emails ? profile.emails[0].value : profile.id}`);

      // Check if user already exists with Facebook ID
      let user = await User.findOne({
        where: { facebook_id: profile.id }
      });

      if (user) {
        // Update tokens
        await user.updateOAuthTokens(accessToken, refreshToken);
        logger.info(`Existing Facebook user logged in: ${user.email}`);
        return done(null, user);
      }

      const email = profile.emails ? profile.emails[0].value : null;
      
      // Check if user exists with same email (if email is available)
      if (email) {
        user = await User.findOne({
          where: { email: email }
        });

        if (user) {
          // Link Facebook account to existing user
          await user.update({
            facebook_id: profile.id,
            oauth_provider: 'facebook',
            avatar_url: profile.photos[0].value,
            oauth_access_token: accessToken,
            oauth_refresh_token: refreshToken
          });
          logger.info(`Facebook account linked to existing user: ${user.email}`);
          return done(null, user);
        }
      }

      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: email || `facebook_${profile.id}@temp.com`, // Temporary email if not provided
        facebook_id: profile.id,
        oauth_provider: 'facebook',
        avatar_url: profile.photos[0].value,
        email_verified: false,
        oauth_access_token: accessToken,
        oauth_refresh_token: refreshToken,
        role_id: 1 // Default role
      });

      logger.info(`New Facebook user created: ${user.email}`);
      return done(null, user);
    } catch (error) {
      logger.error('Facebook OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  logger.warn('Facebook OAuth not configured - missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
}

// Apple Strategy would require additional setup and libraries
// For now, we'll add a placeholder
// TODO: Implement Apple Sign-In strategy

module.exports = passport; 