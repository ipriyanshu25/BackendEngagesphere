// controllers/userController.js
const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { v4: uuidv4 } = require('uuid');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Register a new user
 * POST /user/register
 */
exports.register = async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const userId = uuidv4();
    const newUser = new User({ userId, name, email, password, phone, address });
    await newUser.save();
    return res.status(201).json({ message: 'User registered successfully', userId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Login user
 * POST /user/login
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({ message: 'Login successful', token,userId: user.userId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to verify token
 */
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ message: 'Token required' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = decoded; // { userId: ... }
    next();
  });
};

/**
 * Fetch currently-authenticated user
 * GET /user/profile
 */
exports.profile = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ userId }).select('-password -_id -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAll = async (req, res) => {
  try {
    // pull params from body, with sensible defaults
    let {
      page     = 1,
      limit    = 10,
      search   = '',
      sortBy   = 'createdAt',
      sortOrder= 'desc'
    } = req.body;

    page  = Math.max(1, parseInt(page, 10));
    limit = Math.max(1, parseInt(limit, 10));

    // build search filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // build sort object (newest on top by default)
    const sort = {
      [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1
    };

    // count total for pagination meta
    const total = await User.countDocuments(filter);

    // fetch paged data
    const users = await User
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-password -__v');

    return res.status(200).json({
      data: users,
      meta: {
        total,                   // total matched
        page,                    // current page
        perPage: limit,          // items per page
        lastPage: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    // from verifyToken middleware
    const userId = req.user.userId;
    const { name, phone, address, oldPassword, newPassword } = req.body;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // update simple fields
    if (name)    user.name    = name;
    if (phone)   user.phone   = phone;
    if (address) user.address = address;

    // handle password change
    if (newPassword) {
      if (!oldPassword) {
        return res
          .status(400)
          .json({ message: 'Old password is required to set a new password' });
      }
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Old password is incorrect' });
      }
      user.password = newPassword;
    }

    await user.save();

    // strip sensitive fields
    const safeUser = {
      id:        user.userId,
      name:      user.name,
      email:     user.email,
      phone:     user.phone,
      address:   user.address,
      createdAt: user.createdAt,
    };

    return res.status(200).json({ message: 'Profile updated', user: safeUser });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};