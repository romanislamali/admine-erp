const crypto = require('crypto');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, username, phone, email, role, password } = req.body;
    if (!name || !username || !role || !password) {
      return res.status(400).json({ message: 'Name, username, role, and password are required' });
    }
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!roles.includes(role.toUpperCase())) {
      return res.status(400).json({ message: `Role must be one of ${roles.join(', ')}` });
    }
    const user = await User.create({ name, username, phone, email, role: role.toUpperCase(), password });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === '23505') { // Postgres Unique Violation
      if (error.detail && error.detail.includes('username')) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (error.detail && error.detail.includes('email')) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error.detail && error.detail.includes('phone')) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
      return res.status(400).json({ message: 'A user with these unique credentials already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, phone, email, role, password } = req.body;
    if (!name || !username || !role) {
      return res.status(400).json({ message: 'Name, username, and role are required' });
    }
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!roles.includes(role.toUpperCase())) {
      return res.status(400).json({ message: `Role must be one of ${roles.join(', ')}` });
    }
    
    const existing = await User.getById(id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.update(id, { name, username, phone, email, role: role.toUpperCase(), password });
    res.json(user);
  } catch (error) {
    if (error.code === '23505') { // Postgres Unique Violation
      if (error.detail && error.detail.includes('username')) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (error.detail && error.detail.includes('email')) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error.detail && error.detail.includes('phone')) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
      return res.status(400).json({ message: 'A user with these unique credentials already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await User.getById(id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }
    await User.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = await User.findByUsername(loginIdentifier);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // jti keeps each login's token unique even if issued in the same second for the
    // same user, so revoking one session's token can never collide with another's.
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role, jti: crypto.randomUUID() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Exclude password hash from direct response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logoutUser = async (req, res) => {
  const decoded = jwt.decode(req.token);
  const expiresAt = decoded && decoded.exp ? decoded.exp : Date.now() / 1000 + 24 * 60 * 60;
  tokenBlacklist.revoke(req.token, expiresAt);
  res.json({ message: 'Logged out successfully.' });
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
};

