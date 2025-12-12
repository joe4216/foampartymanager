import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendVerificationCode } from "./email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

function sanitizeUser(user: SelectUser): Omit<SelectUser, "password"> {
  const { password, ...sanitized } = user;
  return sanitized;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const { username, password, firstName, lastName, phone, email } = req.body;
    
    // Validate email is required
    if (!email) {
      return res.status(400).json({ message: "Email is required for account security" });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Validate password requirements
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push("At least 8 characters required");
    if (!/[a-zA-Z]/.test(password)) passwordErrors.push("At least one letter required");
    if (!/[0-9]/.test(password)) passwordErrors.push("At least one number required");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) passwordErrors.push("At least one symbol required");
    
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: "Invalid password", errors: passwordErrors });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Check if email is already registered
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ 
        message: "An account with this email already exists",
        existingAccount: true
      });
    }

    // Create user but DON'T auto-login - require email verification first
    const user = await storage.createUser({
      username,
      password: await hashPassword(password),
      firstName,
      lastName,
      phone,
      email,
    });

    // Generate and send verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const emailResult = await sendVerificationCode(email, code, firstName || undefined);
    
    if (!emailResult.success) {
      console.error("Failed to send registration verification email:", emailResult.error);
      // Still return success but note the email failed - user can resend
      return res.status(201).json({ 
        needsVerification: true,
        userId: user.id,
        email: email.split("@")[0].substring(0, 2) + "***@" + email.split("@")[1],
        emailError: true,
        message: "Account created but failed to send verification email. Please try resending."
      });
    }
    
    await storage.createVerificationCode(user.id, code, expiresAt);
    
    const maskedEmail = email.split("@")[0].substring(0, 2) + "***@" + email.split("@")[1];
    
    res.status(201).json({ 
      needsVerification: true,
      userId: user.id,
      email: maskedEmail,
      message: "Account created! Please check your email for a verification code."
    });
  });

  // Step 1: Validate password and send verification code
  app.post("/api/login/request-code", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    
    const user = await storage.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    // Check if user has email configured
    if (!user.email) {
      return res.status(400).json({ 
        message: "No email configured for this account",
        needsEmail: true,
        userId: user.id
      });
    }
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await storage.createVerificationCode(user.id, code, expiresAt);
    
    // Send email
    const emailResult = await sendVerificationCode(user.email, code, user.firstName || undefined);
    
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      return res.status(500).json({ message: "Failed to send verification code" });
    }
    
    // Mask email for display
    const emailParts = user.email.split("@");
    const maskedEmail = emailParts[0].substring(0, 2) + "***@" + emailParts[1];
    
    res.json({ 
      success: true, 
      message: "Verification code sent",
      email: maskedEmail,
      userId: user.id
    });
  });
  
  // Step 2: Verify code and complete login
  app.post("/api/login/verify-code", async (req, res, next) => {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ message: "User ID and code required" });
    }
    
    const verificationCode = await storage.getValidVerificationCode(parseInt(userId), code);
    
    if (!verificationCode) {
      return res.status(401).json({ message: "Invalid or expired code" });
    }
    
    // Mark code as used
    await storage.markVerificationCodeUsed(verificationCode.id);
    
    // Get user and log them in
    const user = await storage.getUser(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(200).json(sanitizeUser(user));
    });
  });
  
  // Set up email for user (first-time setup)
  app.post("/api/login/set-email", async (req, res) => {
    const { userId, email, password, username } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Verify password again for security
    const user = await storage.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    if (user.id !== parseInt(userId)) {
      return res.status(401).json({ message: "User mismatch" });
    }
    
    // Generate and send verification code FIRST before saving email
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const emailResult = await sendVerificationCode(email, code, user.firstName || undefined);
    
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      return res.status(500).json({ message: "Failed to send verification code. Please try again." });
    }
    
    // Only save email after successful email send
    await storage.updateUserEmail(user.id, email);
    await storage.createVerificationCode(user.id, code, expiresAt);
    
    const emailParts = email.split("@");
    const maskedEmail = emailParts[0].substring(0, 2) + "***@" + emailParts[1];
    
    res.json({ 
      success: true, 
      message: "Email saved and verification code sent",
      email: maskedEmail,
      userId: user.id
    });
  });

  // Legacy login endpoint - disabled for security (now requires email verification)
  app.post("/api/login", async (req, res) => {
    res.status(400).json({ 
      message: "Please use the updated login flow with email verification",
      redirect: "/auth"
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(sanitizeUser(req.user!));
  });
}
