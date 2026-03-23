const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;

                // 1. Already has Google login
                let user = await User.findOne({ googleId: profile.id });
                if (user) return done(null, user);

                // 2. Email exists — link Google to existing account
                user = await User.findOne({ email });
                if (user) {
                    user.googleId = profile.id;
                    user.avatar = user.avatar || profile.photos[0].value;
                    await user.save();
                    return done(null, user);
                }

                // 3. Brand new user — create account
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email,
                    avatar: profile.photos[0].value,
                });

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

module.exports = passport;