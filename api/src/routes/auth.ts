import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';

const router = Router();
// Normalize JWT config to satisfy jsonwebtoken typings
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d';

interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  created_at: string;
  last_login: string | null;
}

// Register endpoint
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      // Check if user exists
      const existingUser = await db.get<User>(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser) {
        return res.status(409).json({ 
          error: 'User already exists with that username or email' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userId = uuidv4();
      await db.run(
        'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
        [userId, username, email, hashedPassword]
      );

      // Generate token
      const token = jwt.sign({ userId, username }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
      });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: userId,
          username,
          email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login endpoint
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user
      const user = await db.get<User>(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username]
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Generate token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify token endpoint
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

    const user = await db.get<User>(
      'SELECT id, username, email, created_at, last_login FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
});

export default router;
