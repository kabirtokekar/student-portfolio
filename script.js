document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registration-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');

    // Password strength indicator
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        updatePasswordStrength(strength);
    });

    const formMessage = document.getElementById('formMessage');

    // Form submission + validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        clearFormMessage();

        if (!validateForm()) {
            setFormMessage('Please fix the highlighted errors before submitting.', 'error');
            return;
        }

        const payload = {
            companyName: document.getElementById('companyName').value.trim(),
            companyType: document.getElementById('companyType').value,
            companyWebsite: document.getElementById('companyWebsite').value.trim(),
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            jobRole: document.getElementById('jobRole').value.trim(),
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value
        };

        setFormMessage('Submitting your registration…', 'success');
        form.querySelector('button[type="submit"]').disabled = true;

        fetch('/api/recruiters/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                setFormMessage(data.message || 'Registration successful! Awaiting admin verification.', 'success');
                form.reset();
                updatePasswordStrength(0);
            } else {
                setFormMessage(data.message || 'There are errors in the form. Please review and try again.', 'error');
                if (data.errors) {
                    Object.keys(data.errors).forEach(fieldId => {
                        const errorElement = document.getElementById(fieldId + 'Error');
                        if (errorElement) showError(errorElement, data.errors[fieldId]);
                    });
                }
            }
        })
        .catch(() => {
            setFormMessage('Unable to submit registration right now. Please try again later.', 'error');
        })
        .finally(() => {
            form.querySelector('button[type="submit"]').disabled = false;
        });
    });

    function setFormMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
    }

    function clearFormMessage() {
        formMessage.textContent = '';
        formMessage.className = 'form-message';
        formMessage.style.display = 'none';
    }

    // Real-time validation
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
    });

    function calculatePasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    }

    function updatePasswordStrength(strength) {
        passwordStrength.className = 'password-strength';
        if (strength <= 2) {
            passwordStrength.classList.add('weak');
        } else if (strength <= 3) {
            passwordStrength.classList.add('medium');
        } else {
            passwordStrength.classList.add('strong');
        }
    }

    function validateForm() {
        let isValid = true;
        const fields = [
            { id: 'companyName', validator: validateRequired, errorId: 'companyNameError' },
            { id: 'companyType', validator: validateRequired, errorId: 'companyTypeError' },
            { id: 'fullName', validator: validateRequired, errorId: 'fullNameError' },
            { id: 'email', validator: validateEmail, errorId: 'emailError' },
            { id: 'phone', validator: validatePhone, errorId: 'phoneError' },
            { id: 'password', validator: validatePassword, errorId: 'passwordError' },
            { id: 'confirmPassword', validator: validateConfirmPassword, errorId: 'confirmPasswordError' }
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorElement = document.getElementById(field.errorId);
            if (!field.validator(input.value)) {
                showError(errorElement, getErrorMessage(field.id, input.value));
                isValid = false;
            } else {
                hideError(errorElement);
            }
        });

        return isValid;
    }

    function validateField(input) {
        const errorElement = document.getElementById(input.id + 'Error');
        let isValid = true;
        let errorMessage = '';

        switch (input.id) {
            case 'companyName':
            case 'fullName':
                isValid = validateRequired(input.value);
                errorMessage = 'This field is required';
                break;
            case 'companyType':
                isValid = validateRequired(input.value);
                errorMessage = 'Please select a company type';
                break;
            case 'email':
                isValid = validateEmail(input.value);
                errorMessage = isValid ? '' : 'Please enter a valid company email address';
                break;
            case 'phone':
                isValid = validatePhone(input.value);
                errorMessage = isValid ? '' : 'Please enter a valid phone number';
                break;
            case 'password':
                isValid = validatePassword(input.value);
                errorMessage = isValid ? '' : 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
                break;
            case 'confirmPassword':
                isValid = validateConfirmPassword(input.value);
                errorMessage = isValid ? '' : 'Passwords do not match';
                break;
            case 'companyWebsite':
                isValid = input.value === '' || validateUrl(input.value);
                errorMessage = isValid ? '' : 'Please enter a valid URL';
                break;
        }

        if (!isValid) {
            showError(errorElement, errorMessage);
        } else {
            hideError(errorElement);
        }
    }

    function validateRequired(value) {
        return value.trim() !== '';
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.toLowerCase().includes('.com') && !email.toLowerCase().includes('gmail') && !email.toLowerCase().includes('yahoo') && !email.toLowerCase().includes('hotmail');
    }

    function validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    function validatePassword(password) {
        return password.length >= 8 &&
               /[a-z]/.test(password) &&
               /[A-Z]/.test(password) &&
               /[0-9]/.test(password) &&
               /[^A-Za-z0-9]/.test(password);
    }

    function validateConfirmPassword(confirmPassword) {
        return confirmPassword === passwordInput.value;
    }

    function validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    function hideError(element) {
        element.textContent = '';
        element.style.display = 'none';
    }

    function getErrorMessage(fieldId, value) {
        switch (fieldId) {
            case 'companyName':
                return 'Company name is required';
            case 'companyType':
                return 'Please select a company type';
            case 'fullName':
                return 'Full name is required';
            case 'email':
                return 'Please enter a valid official company email';
            case 'phone':
                return 'Please enter a valid phone number';
            case 'password':
                return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
            case 'confirmPassword':
                return 'Passwords do not match';
            default:
                return 'This field is required';
        }
    }
});