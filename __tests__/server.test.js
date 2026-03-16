const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../db');

process.env.DB_IN_MEMORY = 'true';

const app = require('../server');

async function createUser({ fullName, email, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO users (fullName, email, passwordHash, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [fullName, email, hash, role, 'active', now, now]
  );
}

describe('Authentication API', () => {
  it('should login with valid credentials', async () => {
    await createUser({ fullName: 'Auth Test', email: 'auth@test.com', password: 'Str0ng!Pass', role: 'student' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth@test.com', password: 'Str0ng!Pass' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.role).toBe('student');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doesnotexist@test.com', password: 'wrong' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Student registration API', () => {
  it('should register a new student', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({
        fullName: 'Test Student',
        email: 'student@example.edu',
        enrollmentNumber: 'ENR-12345',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Registration successful/);
  });

  it('should block duplicate email', async () => {
    await request(app)
      .post('/api/students/register')
      .send({
        fullName: 'First Student',
        email: 'dup@example.edu',
        enrollmentNumber: 'ENR-11111',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    const res = await request(app)
      .post('/api/students/register')
      .send({
        fullName: 'Second Student',
        email: 'dup@example.edu',
        enrollmentNumber: 'ENR-22222',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  it('should block duplicate enrollment number', async () => {
    await request(app)
      .post('/api/students/register')
      .send({
        fullName: 'First Student',
        email: 'unique1@example.edu',
        enrollmentNumber: 'ENR-33333',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    const res = await request(app)
      .post('/api/students/register')
      .send({
        fullName: 'Second Student',
        email: 'unique2@example.edu',
        enrollmentNumber: 'ENR-33333',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.enrollmentNumber).toBeDefined();
  });
});

describe('Recruiter registration API', () => {
  it('should register a new recruiter', async () => {
    const res = await request(app)
      .post('/api/recruiters/register')
      .send({
        companyName: 'Test Corp',
        companyType: 'startup',
        companyWebsite: 'https://test.com',
        fullName: 'Test Recruiter',
        email: 'recruiter@example.com',
        phone: '+1234567890',
        jobRole: 'Hiring Manager'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Registration received/);
  });
});

describe('Faculty registration API', () => {
  it('should register a new faculty member', async () => {
    const res = await request(app)
      .post('/api/faculty/register')
      .send({
        fullName: 'Test Faculty',
        email: 'faculty@example.edu',
        employeeId: 'EMP-100',
        department: 'Computer Science',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Faculty registration successful/);
  });

  it('should block duplicate faculty email', async () => {
    await request(app)
      .post('/api/faculty/register')
      .send({
        fullName: 'First Faculty',
        email: 'dup-faculty@example.edu',
        employeeId: 'EMP-200',
        department: 'Physics',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    const res = await request(app)
      .post('/api/faculty/register')
      .send({
        fullName: 'Second Faculty',
        email: 'dup-faculty@example.edu',
        employeeId: 'EMP-201',
        department: 'Math',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  it('should block duplicate employee ID', async () => {
    await request(app)
      .post('/api/faculty/register')
      .send({
        fullName: 'First Faculty',
        email: 'unique-faculty1@example.edu',
        employeeId: 'EMP-300',
        department: 'Chemistry',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    const res = await request(app)
      .post('/api/faculty/register')
      .send({
        fullName: 'Second Faculty',
        email: 'unique-faculty2@example.edu',
        employeeId: 'EMP-300',
        department: 'Biology',
        password: 'Str0ng!Pass',
        confirmPassword: 'Str0ng!Pass'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.employeeId).toBeDefined();
  });
});
