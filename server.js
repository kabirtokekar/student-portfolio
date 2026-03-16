const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const JWT_EXPIRES_IN = '2h';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function isCompanyEmail(email) {
  const lower = email.toLowerCase();
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
  if (!lower.includes('@')) return false;
  const domain = lower.split('@')[1];
  if (!domain.includes('.')) return false;
  if (personalDomains.includes(domain)) return false;
  return true;
}

function validatePhone(phone) {
  const normalized = phone.replace(/[\s\-\(\)]/g, '');
  return /^[\+]?[1-9][\d]{6,15}$/.test(normalized);
}

function validatePassword(password) {
  return password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  req.user = decoded;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase();
    if (userRole !== role) {
      return res.status(403).json({ success: false, message: 'Forbidden - insufficient permissions' });
    }
    next();
  };
}

async function createStudent({ fullName, email, enrollmentNumber, passwordHash }) {
  const now = new Date().toISOString();
  const status = 'pending';
  const result = await db.run(
    `INSERT INTO students (fullName, email, enrollmentNumber, passwordHash, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [fullName, email, enrollmentNumber, passwordHash, status, now, now]
  );
  return { id: result.lastID, fullName, email, enrollmentNumber, status, createdAt: now, updatedAt: now };
}

async function createUser({ fullName, email, passwordHash, role }) {
  const now = new Date().toISOString();
  const status = 'active';
  const result = await db.run(
    `INSERT INTO users (fullName, email, passwordHash, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [fullName, email, passwordHash, role, status, now, now]
  );
  return { id: result.lastID, fullName, email, role, status, createdAt: now, updatedAt: now };
}

async function findUserByEmail(email) {
  return db.get(`SELECT * FROM users WHERE email = ?;`, [email]);
}

async function findStudentByEmail(email) {
  return db.get(`SELECT * FROM students WHERE email = ?;`, [email]);
}

async function findStudentByEnrollment(enrollmentNumber) {
  return db.get(`SELECT * FROM students WHERE enrollmentNumber = ?;`, [enrollmentNumber]);
}

async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'Administrator';

  const existingAdmin = await findUserByEmail(adminEmail);
  if (existingAdmin) return;

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await createUser({ fullName: adminName, email: adminEmail, passwordHash, role: 'admin' });
  console.log(`Created default admin user: ${adminEmail} / ${adminPassword}`);
}

async function createUserIfNotExists({ fullName, email, passwordHash, role }) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  return createUser({ fullName, email, passwordHash, role });
}

async function promoteStudentToUser(student) {
  if (!student || student.status !== 'approved') return null;
  return createUserIfNotExists({
    fullName: student.fullName,
    email: student.email,
    passwordHash: student.passwordHash,
    role: 'student'
  });
}

async function promoteFacultyToUser(faculty) {
  if (!faculty || faculty.status !== 'approved') return null;
  return createUserIfNotExists({
    fullName: faculty.fullName,
    email: faculty.email,
    passwordHash: faculty.passwordHash,
    role: 'faculty'
  });
}

async function createFaculty({ fullName, email, employeeId, department, role, passwordHash }) {
  const now = new Date().toISOString();
  const status = 'pending';
  const result = await db.run(
    `INSERT INTO faculty (fullName, email, employeeId, department, role, passwordHash, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [fullName, email, employeeId, department, role, passwordHash, status, now, now]
  );
  return { id: result.lastID, fullName, email, employeeId, department, role, status, createdAt: now, updatedAt: now };
}

async function findFacultyByEmail(email) {
  return db.get(`SELECT * FROM faculty WHERE email = ?;`, [email]);
}

async function findFacultyByEmployeeId(employeeId) {
  return db.get(`SELECT * FROM faculty WHERE employeeId = ?;`, [employeeId]);
}

// Authentication / user management
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid credentials.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(400).json({ success: false, message: 'Invalid credentials.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Account not active. Please contact admin.' });
  }

  const token = signToken(user);
  return res.json({ success: true, message: 'Login successful', data: { token, role: user.role, fullName: user.fullName } });
});

const passwordResetTokens = new Map(); // token => { email, expiresAt }

app.post('/api/auth/logout', requireAuth, (req, res) => {
  // For JWT-based stateless sessions, the client simply drops the token.
  return res.json({ success: true, message: 'Logged out' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    // Do not leak whether the email exists.
    return res.json({ success: true, message: 'If an account exists, a reset token has been sent.' });
  }

  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour
  passwordResetTokens.set(token, { email: user.email, expiresAt });

  console.log(`Password reset token for ${user.email}: ${token}`);

  return res.json({
    success: true,
    message: 'Password reset token generated. (In a real app this would be emailed.)',
    data: { token }
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Token and passwords are required.' });
  }

  const stored = passwordResetTokens.get(token);
  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
  }

  const user = await findUserByEmail(stored.email);
  if (!user) {
    return res.status(400).json({ success: false, message: 'Account not found.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updatedAt = new Date().toISOString();
  await db.run(`UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?;`, [passwordHash, updatedAt, user.id]);

  passwordResetTokens.delete(token);
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// Student registration endpoint
app.post('/api/students/register', async (req, res) => {
  const { fullName, email, enrollmentNumber, password, confirmPassword } = req.body;
  const errors = {};

  if (!fullName || !fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!email || !email.trim()) {
    errors.email = 'Email is required.';
  }

  if (!enrollmentNumber || !enrollmentNumber.trim()) {
    errors.enrollmentNumber = 'Enrollment number is required.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (password && !validatePassword(password)) {
    errors.password = 'Password must be 8+ chars and include uppercase, lowercase, number, and special character.';
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  try {
    const existingEmail = await findStudentByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errors: { email: 'Email is already in use.' } });
    }

    const existingEnrollment = await findStudentByEnrollment(enrollmentNumber);
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Enrollment number already registered.', errors: { enrollmentNumber: 'Enrollment number is already in use.' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await createStudent({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      enrollmentNumber: enrollmentNumber.trim(),
      passwordHash
    });

    return res.json({ success: true, message: 'Registration successful. Please wait for admin approval.', data: { id: student.id } });
  } catch (error) {
    console.error('Student registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Faculty registration endpoint
app.post('/api/faculty/register', async (req, res) => {
  const { fullName, email, employeeId, department, password, confirmPassword } = req.body;
  const errors = {};

  if (!fullName || !fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!email || !email.trim()) {
    errors.email = 'Email is required.';
  }

  if (!employeeId || !employeeId.trim()) {
    errors.employeeId = 'Employee ID is required.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (password && !validatePassword(password)) {
    errors.password = 'Password must be 8+ chars and include uppercase, lowercase, number, and special character.';
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  try {
    const existingEmail = await findFacultyByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errors: { email: 'Email is already in use.' } });
    }

    const existingEmployee = await findFacultyByEmployeeId(employeeId);
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Employee ID already registered.', errors: { employeeId: 'Employee ID is already in use.' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const faculty = await createFaculty({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      employeeId: employeeId.trim(),
      department: department ? department.trim() : '',
      role: 'faculty',
      passwordHash
    });

    return res.json({ success: true, message: 'Faculty registration successful. Please wait for admin approval.', data: { id: faculty.id } });
  } catch (error) {
    console.error('Faculty registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

async function createRegistration({ companyName, companyType, companyWebsite, fullName, email, phone, jobRole }) {
  const now = new Date().toISOString();
  const status = 'pending';
  const result = await db.run(
    `INSERT INTO registrations (companyName, companyType, companyWebsite, fullName, email, phone, jobRole, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [companyName, companyType, companyWebsite, fullName, email, phone, jobRole, status, now, now]
  );
  return { id: result.lastID, companyName, companyType, companyWebsite, fullName, email, phone, jobRole, status, createdAt: now, updatedAt: now };
}

async function findRegistrationByEmail(email) {
  return db.get(`SELECT * FROM registrations WHERE email = ?;`, [email]);
}

app.post('/api/recruiters/register', async (req, res) => {
  const { companyName, companyType, companyWebsite, fullName, email, phone, jobRole } = req.body;
  const errors = {};

  if (!companyName || !companyName.trim()) {
    errors.companyName = 'Company name is required.';
  }

  if (!companyType || !companyType.trim()) {
    errors.companyType = 'Company type is required.';
  }

  if (!fullName || !fullName.trim()) {
    errors.fullName = 'Recruiter full name is required.';
  }

  if (!email || !email.trim()) {
    errors.email = 'Email is required.';
  }

  if (!phone || !phone.trim()) {
    errors.phone = 'Phone is required.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (phone && !validatePhone(phone)) {
    errors.phone = 'Please enter a valid phone number.';
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  try {
    const existing = await findRegistrationByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.', errors: { email: 'Email is already in use.' } });
    }

    const registration = await createRegistration({
      companyName: companyName.trim(),
      companyType: companyType.trim(),
      companyWebsite: companyWebsite?.trim() || '',
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      jobRole: jobRole?.trim() || ''
    });

    return res.json({ success: true, message: 'Registration received. Your account will be activated after admin verification.', data: { id: registration.id } });
  } catch (error) {
    console.error('Recruiter registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin endpoints (requires admin role)
app.get('/api/registrations', requireRole('admin'), (req, res) => {
  db.all(`SELECT * FROM registrations;`)
    .then(rows => res.json({ success: true, data: rows }))
    .catch(err => res.status(500).json({ success: false, message: 'Failed to load registrations.' }));
});

app.patch('/api/registrations/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const updatedAt = new Date().toISOString();
  db.run(`UPDATE registrations SET status = ?, updatedAt = ? WHERE id = ?;`, [status, updatedAt, id])
    .then(result => {
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      return res.json({ success: true, message: 'Registration updated.' });
    })
    .catch(() => res.status(500).json({ success: false, message: 'Failed to update registration.' }));
});

// Faculty admin endpoints
app.get('/api/faculty', requireRole('admin'), (req, res) => {
  db.all(`SELECT * FROM faculty;`)
    .then(rows => res.json({ success: true, data: rows }))
    .catch(err => res.status(500).json({ success: false, message: 'Failed to load faculty records.' }));
});

app.patch('/api/faculty/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  try {
    const updatedAt = new Date().toISOString();
    const result = await db.run(`UPDATE faculty SET status = ?, updatedAt = ? WHERE id = ?;`, [status, updatedAt, id]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Faculty record not found.' });
    }

    if (status === 'approved') {
      const facultyRecord = await db.get(`SELECT * FROM faculty WHERE id = ?;`, [id]);
      await promoteFacultyToUser(facultyRecord);
    }

    return res.json({ success: true, message: 'Faculty status updated.' });
  } catch (err) {
    console.error('Failed to update faculty status', err);
    return res.status(500).json({ success: false, message: 'Failed to update faculty status.' });
  }
});

// Student admin endpoints
app.get('/api/students', requireRole('admin'), (req, res) => {
  db.all(`SELECT * FROM students;`)
    .then(rows => res.json({ success: true, data: rows }))
    .catch(() => res.status(500).json({ success: false, message: 'Failed to load student records.' }));
});

app.patch('/api/students/:id', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  try {
    const updatedAt = new Date().toISOString();
    const result = await db.run(`UPDATE students SET status = ?, updatedAt = ? WHERE id = ?;`, [status, updatedAt, id]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    if (status === 'approved') {
      const studentRecord = await db.get(`SELECT * FROM students WHERE id = ?;`, [id]);
      await promoteStudentToUser(studentRecord);
    }

    return res.json({ success: true, message: 'Student status updated.' });
  } catch (err) {
    console.error('Failed to update student status', err);
    return res.status(500).json({ success: false, message: 'Failed to update student status.' });
  }
});

async function start() {
  await db.init();
  await ensureAdminUser();

  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  }
}

start();

module.exports = app;
