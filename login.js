document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const messageEl = document.getElementById('loginMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      setMessage('Email and password are required.', 'error');
      return;
    }

    try {
      setMessage('Signing in…', 'success');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Login failed.', 'error');
        return;
      }

      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('userRole', data.data.role);
      localStorage.setItem('userName', data.data.fullName);

      navigateByRole(data.data.role);
    } catch (err) {
      setMessage('Unable to login right now. Please try again.', 'error');
    }
  });

  document.getElementById('forgotPassword').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter your email to receive a password reset token:');
    if (!email) return;

    setMessage('Sending reset request…', 'success');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Unable to send reset request.', 'error');
        return;
      }

      const tokenMessage = data.data?.token ? `
        Your reset token is: ${data.data.token}
        (In a real app this would be emailed.)
      ` : '';

      setMessage(`${data.message || 'If your email exists, a reset token was generated.'}${tokenMessage}`, 'success');
    } catch (err) {
      setMessage('Unable to process reset request right now. Please try again later.', 'error');
    }
  });

  function navigateByRole(role) {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'student') {
      window.location.href = '/student.html';
    } else if (normalized === 'faculty') {
      window.location.href = '/faculty.html';
    } else if (normalized === 'admin' || normalized === 'hod' || normalized === 'dean') {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/';
    }
  }

  function setMessage(message, type) {
    messageEl.textContent = message;
    messageEl.className = `form-message ${type}`;
    messageEl.style.display = 'block';
  }

  function clearMessage() {
    messageEl.textContent = '';
    messageEl.className = 'form-message';
    messageEl.style.display = 'none';
  }
});
