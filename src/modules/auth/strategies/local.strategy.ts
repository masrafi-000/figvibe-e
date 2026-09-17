import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { compare_password } from '../../../common/utils/password';
import { prisma } from '../../../db';

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
        });

        if (!user) {
          return done(null, false, {
            message: 'Invalid email or password',
          });
        }

        if (user.status !== 'ACTIVE') {
          return done(null, false, {
            message: 'Account is not active',
          });
        }

        if (!user.passwordHash) {
          return done(null, false, {
            message: 'Please sign in using your OAuth Provider',
          });
        }

        const isValidPassword = await compare_password(
          password,
          user.passwordHash,
        );

        if (!isValidPassword) {
          return done(null, false, {
            message: 'Invalid email or password',
          });
        }

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            lastLoginAt: new Date(),
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);
