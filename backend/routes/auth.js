const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const db = getDb();
  const user = db.prepare(`SELECT u.*, d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.username=? AND u.is_active=1`).get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name, department_id: user.department_id },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, email: user.email, dept_name: user.dept_name } });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare(`SELECT u.id,u.username,u.email,u.full_name,u.role,u.department_id,d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=?`).get(req.user.id);
  res.json(user);
});

module.exports = router;
