const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'Name, email, role, and password are required' });
    }
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!roles.includes(role.toUpperCase())) {
      return res.status(400).json({ message: `Role must be one of ${roles.join(', ')}` });
    }
    const user = await User.create({ name, email, role: role.toUpperCase(), password });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === '23505') { // Postgres Unique Violation
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!roles.includes(role.toUpperCase())) {
      return res.status(400).json({ message: `Role must be one of ${roles.join(', ')}` });
    }
    
    const existing = await User.getById(id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.update(id, { name, email, role: role.toUpperCase(), password });
    res.json(user);
  } catch (error) {
    if (error.code === '23505') { // Postgres Unique Violation
      return res.status(400).json({ message: 'Email already exists' });
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email address and password are required' });
    }
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized staff member account or invalid email.' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwtkey_change_me_in_production',
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

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
};

