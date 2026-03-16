document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('facultyForm');
  const messageEl = document.getElementById('formMessage');
  const passwordInput = document.getElementById('facultyPassword');
  const confirmInput = document.getElementById('facultyConfirmPassword');
  const strengthEl = document.getElementById('passwordStrength');

  passwordInput.addEventListener('input', () => {
    const score = calculatePasswordStrength(passwordInput.value);
    updatePasswordStrength(score);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormMessage();

    const payload = {
      fullName: document.getElementById('facultyFullName').value.trim(),
      email: document.getElementById('facultyEmail').value.trim(),
      employeeId: document.getElementById('employeeId').value.trim(),
      department: document.getElementById('department').value.trim(),
      password: passwordInput.value,
      confirmPassword: confirmInput.value
    };

    const localValidation = validateForm(payload);
    if (!localValidation.ok) {
      setFormMessage(localValidation.message, 'error');
      return;
    }

    try {
      setFormMessage('Registering... please wait.', 'success');
      const resp = await fetch('/api/faculty/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (!resp.ok) {
        setFormMessage(data.message || 'Registration failed.', 'error');
        if (data.errors) applyFieldErrors(data.errors);
        return;
      }

      setFormMessage(data.message || 'Registration successful. Await approval.', 'success');
      form.reset();
      updatePasswordStrength(0);
    } catch (err) {
      setFormMessage('Unable to submit. Please try again later.', 'error');
    }
  });

  function validateForm(payload) {
    clearFieldErrors();

    if (!payload.fullName) return { ok: false, message: 'Full name is required.' };
    if (!payload.email) return { ok: false, message: 'Email is required.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return { ok: false, message: 'Enter a valid email address.' };
    if (!payload.employeeId) return { ok: false, message: 'Employee ID is required.' };
    if (!payload.password) return { ok: false, message: 'Password is required.' };
    if (payload.password !== payload.confirmPassword) return { ok: false, message: 'Passwords do not match.' };
    if (!validatePassword(payload.password)) return { ok: false, message: 'Password must be 8+ chars and include uppercase, lowercase, number, and special character.' };

    return { ok: true };
  }

  function validatePassword(password) {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  }

  function applyFieldErrors(errors) {
    Object.entries(errors).forEach(([field, msg]) => {
      const errorEl = document.getElementById(`${field}Error`);
      if (errorEl) {
        errorEl.textContent = msg;
      }
    });
  }

  function clearFieldErrors() {
    document.querySelectorAll('.error-message').forEach(el => (el.textContent = ''));
  }

  function setFormMessage(message, type) {
    messageEl.textContent = message;
    messageEl.className = `form-message ${type}`;
    messageEl.style.display = 'block';
  }

  function clearFormMessage() {
    messageEl.textContent = '';
    messageEl.className = 'form-message';
    messageEl.style.display = 'none';
  }

  function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  function updatePasswordStrength(score) {
    strengthEl.className = 'password-strength';
    if (score <= 2) strengthEl.classList.add('weak');
    else if (score <= 3) strengthEl.classList.add('medium');
    else strengthEl.classList.add('strong');
  }
});
