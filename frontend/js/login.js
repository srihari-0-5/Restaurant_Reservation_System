document.addEventListener('DOMContentLoaded', () => {
    // ... (form toggle logic is the same)
    const showLoginBtn = document.getElementById('show-login-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const clientLoginForm = document.getElementById('client-login-form');
    const registerForm = document.getElementById('register-form');
    showLoginBtn.addEventListener('click', () => { clientLoginForm.classList.add('active'); registerForm.classList.remove('active'); showLoginBtn.classList.add('active'); showRegisterBtn.classList.remove('active'); });
    showRegisterBtn.addEventListener('click', () => { registerForm.classList.add('active'); clientLoginForm.classList.remove('active'); showRegisterBtn.classList.add('active'); showLoginBtn.classList.remove('active'); });

    // --- Client Registration ---
    registerForm.addEventListener('submit', async (e) => {
        // ... (code is the same)
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorEl = document.getElementById('register-error');
        errorEl.textContent = '';
        if (password !== confirmPassword) { errorEl.textContent = 'Passwords do not match.'; return; }
        try {
            const response = await fetch('http://127.0.0.1:5000/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, email, phone }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert('Registration successful! Please login.');
            registerForm.reset();
            showLoginBtn.click();
        } catch (error) { errorEl.textContent = error.message; }
    });

    // --- Client Login (UPDATED) ---
    clientLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('client-login-error');
        errorEl.textContent = '';
        try {
            const response = await fetch('http://127.0.0.1:5000/api/login/client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            // Save user data to localStorage
            localStorage.setItem('restaurantUser', JSON.stringify(result.user));
            
            window.location.href = 'index.html';
        } catch (error) {
            errorEl.textContent = error.message;
        }
    });

    // --- Admin Modal Logic & Login (code is the same) ---
    const adminModal = document.getElementById('admin-modal');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const adminLoginForm = document.getElementById('admin-login-form');
    adminLoginBtn.addEventListener('click', () => adminModal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => adminModal.classList.remove('active'));
    adminModal.addEventListener('click', (e) => { if (e.target === adminModal) adminModal.classList.remove('active'); });
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        const errorEl = document.getElementById('admin-login-error');
        errorEl.textContent = '';
        try {
            const response = await fetch('http://127.0.0.1:5000/api/login/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            window.location.href = 'admin.html';
        } catch (error) { errorEl.textContent = error.message; }
    });
});
