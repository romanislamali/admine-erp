const User = require('../models/user');

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
    const { name, email, role } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!roles.includes(role.toUpperCase())) {
      return res.status(400).json({ message: `Role must be one of ${roles.join(', ')}` });
    }
    const user = await User.create({ name, email, role: role.toUpperCase() });
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
    const { name, email, role } = req.body;
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

    const user = await User.update(id, { name, email, role: role.toUpperCase() });
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
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized staff member account or invalid email.' });
    }
    res.json(user);
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
