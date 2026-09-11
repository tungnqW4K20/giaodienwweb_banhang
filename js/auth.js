/**
 * GreenFruit Eco - Authentication Logic
 * Xử lý đăng nhập, đăng ký tài khoản, tài khoản dùng thử và ghi nhớ phiên đăng nhập.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
  setupRegisterForm();
  setupDemoLogin();
  handleAuthHash();
});

// ==================== ĐĂNG NHẬP ====================
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // 1. Try Django Backend API
    if (window.EcoFruitAPI) {
      try {
        const res = await window.EcoFruitAPI.login(email, password);
        if (res && res.data && res.data.user) {
          const u = res.data.user;
          const localUser = {
            id: u.id,
            fullName: u.full_name,
            email: u.email,
            phone: u.phone_number || '',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            address: u.addresses?.[0]?.detail_address || 'Hà Nội',
            membership: 'Khách hàng VIP EcoFruit',
            points: u.loyalty_points || 100,
            walletBalance: parseInt(u.balance) || 0,
            joinedDate: new Date().toLocaleDateString('vi-VN')
          };
          setCurrentUser(localUser);
          showToast('Đăng nhập thành công!', `Chào mừng ${u.full_name} quay trở lại! (MySQL Auth)`, 'success');
          setTimeout(() => {
            window.location.href = 'profile.html';
          }, 600);
          return;
        }
      } catch (err) {
        // Fallback to local authentication
      }
    }

    // 2. Local Fallback
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (user) {
      setCurrentUser(user);
      showToast('Đăng nhập thành công!', `Chào mừng ${user.fullName} quay trở lại!`, 'success');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 800);
    } else {
      showToast('Đăng nhập thất bại', 'Email hoặc mật khẩu không chính xác.', 'error');
    }
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

    // 1. Try Django Backend API
    if (window.EcoFruitAPI) {
      try {
        const res = await window.EcoFruitAPI.register({
          full_name: fullName,
          email: email,
          phone_number: phone,
          password: password,
          confirm_password: confirmPassword
        });
        if (res && res.data && res.data.user) {
          const u = res.data.user;
          const localUser = {
            id: u.id,
            fullName: u.full_name,
            email: u.email,
            phone: u.phone_number || phone,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            address: 'Hà Nội',
            membership: 'Thành viên Mới',
            points: 100,
            walletBalance: 0,
            joinedDate: new Date().toLocaleDateString('vi-VN')
          };
          setCurrentUser(localUser);
          showToast('Tạo tài khoản thành công!', `Chào mừng ${u.full_name} gia nhập EcoFruit! (Đã lưu DB)`, 'success');
          setTimeout(() => {
            window.location.href = 'profile.html';
          }, 800);
          return;
        }
      } catch (err) {
        // Fallback to local registration
      }
    }

    // 2. Local Fallback
    const users = getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      showToast('Email đã tồn tại', 'Địa chỉ email này đã được đăng ký tài khoản.', 'error');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      fullName: fullName,
      email: email,
      phone: phone,
      password: password,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      address: 'Chưa cập nhật địa chỉ',
      membership: 'Thành viên Mới',
      points: 50,
      walletBalance: 0,
      joinedDate: new Date().toLocaleDateString('vi-VN')
    };

    setCurrentUser(newUser);
    showToast('Tạo tài khoản thành công!', `Chào mừng ${newUser.fullName} gia nhập GreenFruit Eco!`, 'success');

    setTimeout(() => {
      window.location.href = 'profile.html';
    }, 1000);
  });
}

// ==================== NÚT ĐĂNG NHẬP NHANH DEMO ====================
function setupDemoLogin() {
  const btnDemo = document.getElementById('btn-demo-login');
  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      setCurrentUser(DEFAULT_USER);
      showToast('Đăng nhập Demo thành công!', `Đang đăng nhập với tài khoản: ${DEFAULT_USER.fullName}`, 'success');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 600);
    });
  }
}

// Kiểm tra Hash #register
function handleAuthHash() {
  if (window.location.hash === '#register') {
    const regTab = document.getElementById('tab-register');
    if (regTab) bootstrap.Tab.getInstance(regTab)?.show() || new bootstrap.Tab(regTab).show();
  }
}
