import { betterAuth } from "better-auth";
// @ts-ignore
import { Pool } from "pg";
import {
  sendEmail,
  resetPasswordEmail,
  verifyEmail,
  changeEmailApproval,
  deleteAccountEmail,
} from "./email";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    // Verification is encouraged, not enforced: sign-in stays instant so a
    // new user can reach their first query without an inbox round-trip.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Intelliquery password",
        html: resetPasswordEmail(user.name, url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Intelliquery email",
        html: verifyEmail(user.name, url),
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // Approval goes to the CURRENT address so a hijacked session can't
      // silently swap the account email.
      sendChangeEmailVerification: async ({ user, newEmail, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Approve your Intelliquery email change",
          html: changeEmailApproval(user.name, newEmail, url),
        });
      },
    },
    deleteUser: {
      enabled: true,
      // Email confirmation works for both password and Google accounts.
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirm deleting your Intelliquery account",
          html: deleteAccountEmail(user.name, url),
        });
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
