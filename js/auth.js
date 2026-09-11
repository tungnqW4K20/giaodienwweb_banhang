/**
 * GreenFruit Eco - Authentication Logic (Enterprise Zero-Cache Mode)
 * Xử lý đăng nhập, đăng ký tài khoản, chuyển đổi tài khoản thử nghiệm nhanh và bảo mật phiên.
 */

document.addEventListener('DOMContentLoaded', () => {
  checkLogoutQueryParam();
  setupLoginForm();
  setupRegisterForm();
  setupQuickTestUsers();
  handleAuthHash();
});

// ==================== KIỂM TRA TRẠNG THÁI VỪA ĐĂNG XUẤT ====================
function checkLogoutQueryParam() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('logged_out') === '1') {
    const banner = document.getElementById('logout-alert-banner');
    if (banner) {
      banner.classList.remove('d-none');
      banner.classList.add('d-flex');
    }
  }
}

// ==================== ĐĂNG NHẬP CHUYÊN NGHIỆP ====================
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btnSubmit = document.getElementById('btn-submit-login');

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang xác thực...';
    }

    try {
      // 1. Authenticate against Django REST MySQL API
      if (window.EcoFruitAPI) {
        const res = await window.EcoFruitAPI.login(email, password);
        if (res && res.data && res.data.user) {
          const u = res.data.user;
          showToast('Đăng nhập thành công!', `Chào mừng ${u.full_name} (${u.email})!`, 'success');
          
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect') || 'profile.html';

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 600);
          return;
        }
      }
      throw new Error('Không thể kết nối đến máy chủ xác thực.');
    } catch (err) {
      showToast('Đăng nhập thất bại', err.message || 'Email hoặc mật khẩu không chính xác.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket me-2"></i> Đăng Nhập Ngay';
      }
    }
  });
}

// ==================== TÀI KHOẢN TEST NHANH (1-CLICK) ====================
function setupQuickTestUsers() {
  const quickBtns = document.querySelectorAll('.quick-user-btn');
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.email;
      const pass = btn.dataset.pass;

      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const form = document.getElementById('login-form');

      if (emailInput && passInput && form) {
        emailInput.value = email;
        passInput.value = pass;
        
        // Highlight inputs briefly
        emailInput.classList.add('is-valid');
        passInput.classList.add('is-valid');

        // Automatically trigger submit
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  });
}

// ==================== ĐĂNG KÝ TÀI KHOẢN MỚI ====================
function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
      showToast('Mật khẩu không khớp', 'Mật khẩu xác nhận phải trùng khớp.', 'error');
      return;
    }

    try {
      if (window.EcoFruitAPI) {
        const res = await window.EcoFruitAPI.register({
          full_name: fullName,
          email: email,
          phone_number: phone,
          password: password,
          confirm_password: confirmPassword
        });
        if (res && res.data && res.data.user) {
          const u = res.data.user;
          showToast('Tạo tài khoản thành công!', `Chào mừng ${u.full_name} gia nhập EcoFruit!`, 'success');
          setTimeout(() => {
            window.location.href = 'profile.html';
          }, 700);
          return;
        }
      }
    } catch (err) {
      showToast('Đăng ký thất bại', err.message || 'Không thể đăng ký tài khoản. Vui lòng thử lại.', 'error');
    }
  });
}

// Kiểm tra Hash #register
function handleAuthHash() {
  if (window.location.hash === '#register') {
    const regTab = document.getElementById('tab-register');
    if (regTab) {
      bootstrap.Tab.getInstance(regTab)?.show() || new bootstrap.Tab(regTab).show();
    }
  }
}

