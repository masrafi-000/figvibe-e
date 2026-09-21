import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../../../config/env';
import { prisma } from '../../../db';

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('Google account does not provide an email'));
          }

          const providerAccountId = profile.id;

          let account = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: 'GOOGLE',
                providerAccountId,
              },
            },
            include: {
              user: true,
            },
          });

          if (account) {
            await prisma.user.update({
              where: {
                id: account.user.id,
              },
              data: {
                lastLoginAt: new Date(),
              },
            });

            return done(null, account.user);
          }

          let user = await prisma.user.findUnique({
            where: {
              email: email.toLowerCase(),
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                emailVerified: new Date(),

                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,

                avatarUrl: profile.photos?.[0]?.value,

                lastLoginAt: new Date(),
              },
            });
          }

          await prisma.account.create({
            data: {
              userId: user.id,

              provider: 'GOOGLE',
              providerAccountId,

              accessToken,
              refreshToken: refreshToken || null,
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}
