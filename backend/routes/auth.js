const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../utils/jwt');

const router = express.Router();

// Rate limiting for auth endpoints (stricter than global)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = new User({
      email: email.toLowerCase().trim(),
      password: password,
      name: name?.trim()
    });

    // Save user (password will be hashed by pre-save hook)
    await newUser.save();

    // Generate JWT token
    const token = generateToken(newUser);

    // Return success response
    res.status(201).json({
      message: 'Account created successfully',
      user: newUser.getSafeData(),
      token: token
    });

    console.log(`✅ New user registered: ${email}`);

  } catch (error) {
    console.error('Signup error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email address is already in use'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create account'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return success response
    res.status(200).json({
      message: 'Login successful',
      user: user.getSafeData(),
      token: token
    });

    console.log(`✅ User logged in: ${email}`);

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user data
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.status(200).json({
      user: user.getSafeData()
    });

  } catch (error) {
    console.error('Get user error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user data'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      name, 
      dailyGoal, 
      defaultWaterAmount,
      notificationsEnabled, 
      notificationStartHour,
      notificationEndHour,
      notificationFrequency,
      timezone 
    } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name.trim();
    
    if (dailyGoal !== undefined) {
      if (dailyGoal < 500 || dailyGoal > 5000) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Daily goal must be between 500ml and 5000ml'
        });
      }
      user.dailyGoal = dailyGoal;
    }
    
    if (defaultWaterAmount !== undefined) {
      if (defaultWaterAmount < 50 || defaultWaterAmount > 1000) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Default water amount must be between 50ml and 1000ml'
        });
      }
      user.defaultWaterAmount = defaultWaterAmount;
    }
    
    if (notificationStartHour !== undefined) {
      if (notificationStartHour < 0 || notificationStartHour > 23) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Notification start hour must be between 0 and 23'
        });
      }
      user.notificationStartHour = notificationStartHour;
    }
    
    if (notificationEndHour !== undefined) {
      if (notificationEndHour < 0 || notificationEndHour > 23) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Notification end hour must be between 0 and 23'
        });
      }
      user.notificationEndHour = notificationEndHour;
    }
    
    if (notificationFrequency !== undefined) {
      const validFrequencies = ['1min', '30min', '1hr', '2hr'];
      if (!validFrequencies.includes(notificationFrequency)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Notification frequency must be 1min, 30min, 1hr, or 2hr'
        });
      }
      user.notificationFrequency = notificationFrequency;
    }
    
    if (notificationsEnabled !== undefined) user.notificationsEnabled = notificationsEnabled;
    if (timezone !== undefined) user.timezone = timezone;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: user.getSafeData()
    });

    console.log(`✅ User profile updated: ${user.email}`);

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully'
    });

    console.log(`✅ Password changed for user: ${user.email}`);

  } catch (error) {
    console.error('Change password error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

module.exports = router;
