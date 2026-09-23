import passport from 'passport';
import { prisma } from '../db';

import '../modules/auth/strategies/local.strategy';
import '../modules/auth/strategies/google.strategy';

passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
});

export default passport;
