/**
 * GreenFruit Eco - Common Scripts
 * Xử lý giỏ hàng badge, toast notification, tìm kiếm nhanh, trạng thái đăng nhập và các tiện ích dùng chung.
 */

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  checkAuthState();
  setupGlobalSearch();
  setupActiveNav();
});

// ==================== CẬP NHẬT BADGE GIỎ HÀNG ====================
function updateCartBadge() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const badgeElements = document.querySelectorAll('.cart-badge-count');
  badgeElements.forEach(badge => {
    badge.textContent = totalCount;
    if (totalCount > 0) {
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  });
}
window.updateCartBadge = updateCartBadge;

// ==================== TOAST NOTIFICATION THỜI TRANG ====================
function showToast(title, message, type = 'success') {
  let toastContainer = document.querySelector('.toast-container-gf');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container-gf';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast-gf toast-${type}`;
  
  let iconClass = 'fa-solid fa-circle-check text-success';
  if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation text-danger';
  if (type === 'info') iconClass = 'fa-solid fa-circle-info text-info';

  toast.innerHTML = `
    <i class="${iconClass} fs-4"></i>
    <div class="flex-grow-1">
      <strong class="d-block text-dark font-heading">${title}</strong>
      <span class="text-muted small">${message}</span>
    </div>
    <button type="button" class="btn-close ms-2 small" onclick="this.parentElement.remove()"></button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

// ==================== SINH HTML CARD SẢN PHẨM ====================
function renderProductCardHTML(p) {
  const discountPercent = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const seasonInfo = SEASONS[p.season] || { name: p.seasonName || '', badgeClass: 'badge-season-in' };
  const cleanUnit = (p.unit || 'kg').split('(')[0].trim();

  return `
    <div class="col-6 col-md-4 col-lg-3 mb-4">
      <div class="product-card">
        <div class="product-card-img-wrap">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
          <div class="product-badges-top">
            <span class="badge-season ${seasonInfo.badgeClass}">
              <i class="fa-solid fa-leaf"></i> ${p.season === 'dung-mua' ? 'Đúng Mùa' : (p.season === 'trai-mua' ? 'Trái Mùa' : 'Nhập Khẩu')}
            </span>
            ${discountPercent > 0 ? `<span class="product-discount-pill">-${discountPercent}%</span>` : ''}
          </div>
          <div class="product-quick-actions">
            <a href="product-detail.html?id=${p.id}" class="btn-quick-view" title="Xem chi tiết">
              <i class="fa-solid fa-eye"></i>
            </a>
          </div>
        </div>
        <div class="product-card-body">
          <div class="product-category-tag">${p.categoryName}</div>
          <h3 class="product-title">
            <a href="product-detail.html?id=${p.id}">${p.name}</a>
          </h3>
          <div class="product-specs-meta">
            <span class="badge-cert"><i class="fa-solid fa-shield-halved text-success me-1"></i>${p.cert}</span>
            <span class="badge-cert"><i class="fa-solid fa-location-dot text-danger me-1"></i>${p.origin.split(',')[0]}</span>
          </div>
          <div class="product-rating-meta">
            <span class="stars">
              <i class="fa-solid fa-star"></i>
              <strong class="text-dark ms-1">${p.rating}</strong>
            </span>
            <span class="sales">Đã bán ${p.salesCount}</span>
          </div>
          <div class="product-card-footer mt-auto">
            <div class="product-price-box">
              <div class="d-flex align-items-baseline gap-1 flex-wrap">
                <span class="current-price">${formatCurrency(p.price)}</span>
                ${p.originalPrice > p.price ? `<span class="original-price">${formatCurrency(p.originalPrice)}</span>` : ''}
              </div>
              <div class="unit-text">/${cleanUnit}</div>
            </div>
            <button class="btn-add-cart-mini" onclick="handleQuickAddToCart('${p.id}', event)" title="Thêm vào giỏ hàng">
              <i class="fa-solid fa-cart-plus"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
window.renderProductCardHTML = renderProductCardHTML;

// ==================== THÊM NHANH VÀO GIỎ ====================
function handleQuickAddToCart(productId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const success = addToCart(productId, 1);
  if (success) {
    const product = getProductById(productId);
    showToast('Đã thêm vào giỏ!', `Đã thêm 1 ${product.unit} ${product.name} vào giỏ hàng.`, 'success');
  }
}
window.handleQuickAddToCart = handleQuickAddToCart;

// ==================== KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP ====================
function checkAuthState() {
  const currentUser = getCurrentUser();
  const authContainer = document.getElementById('header-auth-container');
  if (!authContainer) return;

  if (currentUser) {
    authContainer.innerHTML = `
      <div class="dropdown">
        <a href="#" class="header-action-btn dropdown-toggle text-decoration-none" data-bs-toggle="dropdown" aria-expanded="false">
          <img src="${currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="${currentUser.fullName}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">
          <span class="d-none d-md-inline">${currentUser.fullName.split(' ').pop()}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-4 mt-2">
          <li class="px-3 py-2 border-bottom">
            <div class="fw-bold">${currentUser.fullName}</div>
            <small class="text-muted">${currentUser.email}</small>
            <div class="mt-1"><span class="badge bg-success">${currentUser.membership || 'Thành viên'}</span></div>
          </li>
          <li><a class="dropdown-item py-2" href="profile.html"><i class="fa-regular fa-user me-2 text-primary"></i>Tài khoản của tôi</a></li>
          <li><a class="dropdown-item py-2" href="profile.html#orders"><i class="fa-solid fa-box-open me-2 text-primary"></i>Lịch sử đơn hàng</a></li>
          <li><a class="dropdown-item py-2" href="profile.html#vnpay-test"><i class="fa-solid fa-wallet me-2 text-warning"></i>Nạp / Test VNPay</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item py-2 text-danger" href="javascript:void(0)" onclick="logoutUser()"><i class="fa-solid fa-arrow-right-from-bracket me-2"></i>Đăng xuất</a></li>
        </ul>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="auth.html" class="header-action-btn">
        <div class="icon-wrap"><i class="fa-regular fa-user"></i></div>
        <span class="d-none d-md-inline">Tài khoản</span>
      </a>
    `;
  }
}

// Đăng xuất
function logoutUser() {
  localStorage.removeItem(DB_KEYS.CURRENT_USER);
  showToast('Đã đăng xuất', 'Hẹn gặp lại quý khách tại GreenFruit Eco!', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 800);
}
window.logoutUser = logoutUser;

// ==================== TÌM KIẾM NHANH TOÀN TRANG ====================
function setupGlobalSearch() {
  const searchInputs = document.querySelectorAll('.global-search-input');
  searchInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = input.value.trim();
        if (query) {
          window.location.href = `products.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  });

  const searchButtons = document.querySelectorAll('.btn-search-trigger');
  searchButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parentForm = btn.closest('.header-search-box') || btn.closest('form');
      const input = parentForm ? parentForm.querySelector('input') : null;
      if (input && input.value.trim()) {
        window.location.href = `products.html?search=${encodeURIComponent(input.value.trim())}`;
      }
    });
  });
}

// Active Nav Link highlight
function setupActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link, .mobile-nav-item');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}
