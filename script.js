import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dom = {
    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    closeAuth: document.querySelector('.close-auth'),
    
    // Login Elements
    emailInput: document.getElementById('auth-email'),
    passwordInput: document.getElementById('auth-password'),
    loginSubmit: document.getElementById('auth-submit'),
    
    // Enrollment Elements
    enrollmentInput: document.getElementById('enrollment-number'),
    verificationCode: document.getElementById('verification-code'),
    firstName: document.getElementById('first-name'),
    lastName: document.getElementById('last-name'),
    signupPassword: document.getElementById('password'),
    signupSubmit: document.getElementById('signup-submit'),
    
    // Common Elements
    toggleAuth: document.getElementById('toggle-auth'),
    forgotPassword: document.getElementById('forgot-password'),
    errorMessage: document.getElementById('error-message'),
    successMessage: document.getElementById('success-message'),
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    
    // Profile Elements
    logoutBtn: document.querySelector('.logout-btn'),
    profileBtn: document.querySelector('.profile-btn'),
    profileEmail: document.querySelector('.profile-email')
  };

  // State Management
  let isLogin = true;
  let currentUser = null;
  let currentStep = 1;
  let enrollmentNumber = '';

  // Utility Functions
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const validateEnrollment = (enrollment) => /^[A-Z0-9]{8,20}$/.test(enrollment);
  
  const validatePassword = (password) => 
    password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const clearErrors = () => {
    dom.errorMessage.textContent = '';
    dom.errorMessage.style.display = 'none';
    document.querySelectorAll('.input-error').forEach(el => 
      el.classList.remove('input-error'));
  };

  const showError = (message) => {
    dom.errorMessage.textContent = message;
    dom.errorMessage.style.display = 'block';
  };

  const showSuccess = (message) => {
    dom.successMessage.textContent = message;
    dom.successMessage.style.display = 'block';
    setTimeout(() => dom.successMessage.style.display = 'none', 5000);
  };

  const toggleLoading = (loading) => {
    const submitBtn = isLogin ? dom.loginSubmit : dom.signupSubmit;
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading 
      ? '<div class="spinner"></div>' 
      : (isLogin ? 'Sign In' : 'Continue');
  };

  // Auth Handlers
  const handleLogin = async (email, password) => {
    try {
      clearErrors();
      toggleLoading(true);

      if (!validateEmail(email)) {
        dom.emailInput.classList.add('input-error');
        throw new Error('Invalid email format');
      }

      if (!validatePassword(password)) {
        dom.passwordInput.classList.add('input-error');
        throw new Error('Password must be 8+ chars with uppercase and number');
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      dom.authModal.style.display = 'none';
      updateAuthUI();
      showSuccess('Login successful!');

    } catch (error) {
      showError(error.message);
    } finally {
      toggleLoading(false);
    }
  };

  const handleEnrollmentSignup = async () => {
    try {
      clearErrors();
      toggleLoading(true);

      if (currentStep === 1) {
        enrollmentNumber = dom.enrollmentInput.value.trim();
        
        if (!validateEnrollment(enrollmentNumber)) {
          dom.enrollmentInput.classList.add('input-error');
          throw new Error('Invalid enrollment number format');
        }

        const response = await fetch('/functions/initiate-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentNumber })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Verification failed');

        currentStep = 2;
        dom.step1.style.display = 'none';
        dom.step2.style.display = 'block';
        dom.verificationCode.focus();

      } else {
        const code = dom.verificationCode.value.trim();
        const firstName = dom.firstName.value.trim();
        const lastName = dom.lastName.value.trim();
        const password = dom.signupPassword.value;

        if (!code || !firstName || !lastName || !password) {
          throw new Error('All fields are required');
        }

        if (!validatePassword(password)) {
          dom.signupPassword.classList.add('input-error');
          throw new Error('Password must be 8+ chars with uppercase and number');
        }

        const response = await fetch('/functions/complete-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentNumber, code, firstName, lastName, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');

        showSuccess('Account created successfully!');
        setTimeout(() => globalThis.location.href = '/dashboard', 2000);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      toggleLoading(false);
    }
  };

  // UI Updates
  const updateAuthUI = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email_confirmed_at) {
        dom.profileEmail.textContent = user.email;
        dom.logoutBtn.style.display = 'block';
        currentUser = user;
      } else {
        dom.profileEmail.textContent = 'Guest';
        dom.logoutBtn.style.display = 'none';
        currentUser = null;
      }
    });
  };

  const resetFormState = () => {
    currentStep = 1;
    enrollmentNumber = '';
    dom.step1.style.display = 'block';
    dom.step2.style.display = 'none';
    dom.authForm.reset();
    clearErrors();
  };

  // Event Listeners
  dom.toggleAuth.addEventListener('click', () => {
    isLogin = !isLogin;
    resetFormState();
    dom.toggleAuth.textContent = isLogin 
      ? 'Create Account' 
      : 'Already have an account? Sign In';
    dom.authForm.dataset.mode = isLogin ? 'login' : 'signup';
  });

  dom.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLogin) {
      await handleLogin(dom.emailInput.value, dom.passwordInput.value);
    } else {
      await handleEnrollmentSignup();
    }
  });

  dom.forgotPassword.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter your registered email:');
    if (email && validateEmail(email)) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${globalThis.location.origin}/reset-password`
      });
      error ? showError(error.message) : showSuccess('Reset email sent!');
    }
  });

  dom.logoutBtn.addEventListener('click', () => {
    supabase.auth.signOut().then(updateAuthUI);
  });

  dom.closeAuth.addEventListener('click', () => {
    dom.authModal.style.display = 'none';
    resetFormState();
  });

  dom.profileBtn.addEventListener('click', () => {
    if (!currentUser) {
      dom.authModal.style.display = 'flex';
      dom[isLogin ? 'emailInput' : 'enrollmentInput'].focus();
    }
  });

  // Auth State Listener
  supabase.auth.onAuthStateChange((event, _session) => {
    if (event === 'SIGNED_OUT') resetFormState();
    updateAuthUI();
  });

  // Initial Setup
  updateAuthUI();
});