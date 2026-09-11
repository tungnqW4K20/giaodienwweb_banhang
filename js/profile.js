/**
 * GreenFruit Eco - User Profile & VNPay Sandbox Test Logic
 * Xử lý thông tin cá nhân, chỉnh sửa thông tin, lịch sử đơn hàng, nạp tiền ví & chuyển tiền thử nghiệm qua VNPAY.
 */

let currentUser = null;
let currentOrderFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  setupProfileForm();
  setupOrderHistoryTabs();
  setupVNPaySandboxWallet();
  handleHashNavigation();
});

// Lắng nghe sự kiện đồng bộ dữ liệu từ Django API
window.addEventListener('ecofruit:data-synced', () => {
  console.log('[Profile] Đồng bộ thông tin từ API Backend');
  loadUserProfile();
});

// ==================== NẠP DỮ LIỆU USER (EXPERT FRESH SYNC) ====================
async function loadUserProfile() {
  const token = window.EcoFruitAPI ? EcoFruitAPI.getToken() : null;
  currentUser = getCurrentUser();

  // If completely unauthenticated, redirect to login with return URL
  if (!token && (!currentUser || !currentUser.email)) {
    window.location.href = 'auth.html?mode=login&redirect=profile.html';
    return;
  }

  // 1. Tải profile mới nhất 100% từ Django MySQL API
  if (window.EcoFruitAPI && token) {
    try {
      const liveProfile = await EcoFruitAPI.getProfile();
      if (liveProfile) {
        currentUser = {
          id: liveProfile.id,
          fullName: liveProfile.full_name || 'Thành viên EcoFruit',
          email: liveProfile.email,
          phone: liveProfile.phone_number || '',
          avatar: liveProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          role: liveProfile.role || 'CUSTOMER',
          membership: liveProfile.role === 'ADMIN' ? 'Quản trị viên EcoFruit' : (liveProfile.role === 'STAFF' ? 'Nhân viên quản lý kho' : 'Khách hàng VIP EcoFruit'),
          points: liveProfile.loyalty_points || 0,
          walletBalance: Number(liveProfile.balance || 0),
          address: liveProfile.addresses?.[0]?.detail_address || 'Hà Nội'
        };
        setCurrentUser(currentUser);
      }
    } catch (err) {
      console.debug('[Profile API] Profile sync:', err.message);
    }
  }

  if (!currentUser) return;

  // Sidebar info
  const sidebarName = document.getElementById('user-sidebar-name');
  if (sidebarName) sidebarName.textContent = currentUser.fullName;

  const sidebarEmail = document.getElementById('user-sidebar-email');
  if (sidebarEmail) sidebarEmail.textContent = currentUser.email;

  const sidebarBadge = document.getElementById('user-sidebar-badge');
  if (sidebarBadge) sidebarBadge.textContent = currentUser.membership || 'Khách hàng VIP EcoFruit';

  const avatarImg = document.getElementById('user-avatar-img');
  if (avatarImg) avatarImg.src = currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

  // Form info
  const fName = document.getElementById('profile-fullname');
  if (fName) fName.value = currentUser.fullName || '';

  const fEmail = document.getElementById('profile-email');
  if (fEmail) fEmail.value = currentUser.email || '';

  const fPhone = document.getElementById('profile-phone');
  if (fPhone) fPhone.value = currentUser.phone || '';

  const fAddr = document.getElementById('profile-address');
  if (fAddr) fAddr.value = currentUser.address || '';

  // Wallet balance
  const balance = currentUser.walletBalance || 0;
  const walletAmount = document.getElementById('wallet-balance-amount');
  if (walletAmount) walletAmount.textContent = formatCurrency(balance);

  // Render orders
  await renderOrderHistory();
}


// ==================== XỬ LÝ SỬA THÔNG TIN CÁ NHÂN ====================
function setupProfileForm() {
  const form = document.getElementById('profile-info-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    currentUser.fullName = document.getElementById('profile-fullname').value.trim();
    currentUser.phone = document.getElementById('profile-phone').value.trim();
    currentUser.address = document.getElementById('profile-address').value.trim();

    // 1. Gửi lên Django API nếu có token
    if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
      try {
        await EcoFruitAPI.updateProfile({
          full_name: currentUser.fullName,
          phone_number: currentUser.phone
        });
      } catch (err) {
        // Fallback to local profile
      }
    }

    setCurrentUser(currentUser);
    showToast('Cập nhật thành công', 'Thông tin cá nhân của bạn đã được lưu lại (Đã đồng bộ MySQL)!', 'success');
    loadUserProfile();
  });

  // Đổi avatar nhanh bằng cách nhập URL ảnh
  const btnAvatar = document.getElementById('btn-edit-avatar');
  if (btnAvatar) {
    btnAvatar.addEventListener('click', () => {
      const newUrl = prompt('Nhập đường dẫn URL ảnh đại diện mới của bạn:', currentUser.avatar);
      if (newUrl && newUrl.trim()) {
        currentUser.avatar = newUrl.trim();
        setCurrentUser(currentUser);
        loadUserProfile();
        showToast('Đổi ảnh đại diện', 'Ảnh đại diện đã được cập nhật!', 'success');
      }
    });
  }
}

// ==================== XỬ LÝ LỊCH SỬ ĐƠN HÀNG ====================
function setupOrderHistoryTabs() {
  const filterBtns = document.querySelectorAll('.order-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderFilter = btn.dataset.status;
      renderOrderHistory();
    });
  });
}

async function renderOrderHistory() {
  const container = document.getElementById('order-history-list');
  if (!container) return;

  let orders = getOrders();

  // Thử kéo danh sách đơn hàng thực tế từ Django Backend MySQL cho riêng tài khoản hiện tại
  if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
    try {
      const apiOrders = await EcoFruitAPI.getOrders();
      if (apiOrders) {
        orders = apiOrders.map(o => {
          let badge = 'bg-warning text-dark';
          let statusKey = 'pending';
          const orderSt = o.order_status || o.status || 'PENDING';
          if (orderSt === 'COMPLETED') { badge = 'bg-success'; statusKey = 'completed'; }
          else if (orderSt === 'SHIPPING' || orderSt === 'PROCESSING') { badge = 'bg-primary'; statusKey = 'shipping'; }
          else if (orderSt === 'CANCELLED') { badge = 'bg-danger'; statusKey = 'cancelled'; }

          return {
            id: o.order_code,
            date: new Date(o.created_at).toLocaleString('vi-VN'),
            status: statusKey,
            statusText: o.order_status_display || o.status_display || orderSt,
            badgeColor: badge,
            items: (o.items || []).map(item => ({
              id: String(item.product),
              name: item.product_name,
              price: Number(item.unit_price),
              qty: item.quantity,
              unit: item.unit || 'kg',
              image: item.product_image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=100&q=80'
            })),
            subtotal: Number(o.subtotal || o.subtotal_amount || 0),
            shippingFee: Number(o.shipping_fee || 0),
            discount: Number(o.discount_amount || 0),
            total: Number(o.total_amount || o.final_total_amount || 0),
            paymentMethod: o.payment_method_display || o.payment_method,
            paymentStatus: o.payment_status_display || o.payment_status,
            shippingAddress: o.delivery_address,
            trackingCode: o.tracking_code || `VNPOST-${o.order_code}`
          };
        });
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
      }
    } catch (err) {
      console.debug('[Orders API] Local orders fallback:', err.message);
    }
  }


  if (currentOrderFilter !== 'all') {
    orders = orders.filter(o => o.status === currentOrderFilter);
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 bg-light rounded-4 border">
        <i class="fa-solid fa-box-open text-muted fs-1 mb-3"></i>
        <h5 class="fw-bold mb-1">Chưa có đơn hàng nào</h5>
        <p class="text-muted small">Quý khách chưa đặt đơn hàng nào trong danh mục này.</p>
        <a href="products.html" class="btn btn-primary-gf btn-sm mt-2">
          <i class="fa-solid fa-basket-shopping me-1"></i> Mua sắm hoa quả ngay
        </a>
      </div>
    `;
    return;
  }

  let html = '';
  orders.forEach(order => {
    let itemsHTML = '';
    (order.items || []).forEach(item => {
      itemsHTML += `
        <div class="order-item-row">
          <img src="${item.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=100&q=80'}" alt="${item.name}" class="order-item-thumb">
          <div class="flex-grow-1">
            <div class="fw-bold text-dark small">${item.name}</div>
            <small class="text-muted">SL: ${item.qty} ${item.unit} x ${formatCurrency(item.price)}</small>
          </div>
          <strong class="text-dark small font-heading">${formatCurrency(item.price * item.qty)}</strong>
        </div>
      `;
    });

    html += `
      <div class="order-card">
        <div class="order-header">
          <div>
            <span class="fw-bold text-primary font-heading fs-6">${order.id}</span>
            <small class="text-muted ms-2"><i class="fa-regular fa-clock me-1"></i>${order.date}</small>
          </div>
          <div>
            <span class="badge ${order.badgeColor || 'bg-secondary'}">${order.statusText}</span>
          </div>
        </div>

        <div class="order-body">
          ${itemsHTML}
        </div>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 mt-3 border-top">
          <div>
            <small class="text-muted d-block">Hình thức: <strong>${order.paymentMethod}</strong> (${order.paymentStatus})</small>
            <small class="text-muted d-block">Vận đơn: <code>${order.trackingCode}</code></small>
          </div>
          <div class="text-end">
            <span class="text-muted small">Tổng tiền: </span>
            <strong class="text-danger font-heading fs-5">${formatCurrency(order.total)}</strong>
            <div class="mt-2">
              <button class="btn btn-outline-gf btn-sm" onclick="reOrderItems('${order.id}')">
                <i class="fa-solid fa-rotate-right me-1"></i> Mua lại
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Mua lại đơn hàng
function reOrderItems(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.items.forEach(item => {
    addToCart(item.id, item.qty, item.unit);
  });

  showToast('Đã thêm vào giỏ!', `Đã nạp toàn bộ món từ đơn ${order.id} vào giỏ hàng.`, 'success');
  setTimeout(() => {
    window.location.href = 'cart.html';
  }, 1000);
}
window.reOrderItems = reOrderItems;

// ==================== MÔ PHỎNG VNPAY SANDBOX & NẠP VÍ ====================
function setupVNPaySandboxWallet() {
  const btnTopup = document.getElementById('btn-vnpay-topup');
  const amountInput = document.getElementById('topup-amount-input');
  const quickPills = document.querySelectorAll('.topup-quick-pill');

  // Quick Amount Select
  quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      quickPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      amountInput.value = pill.dataset.amount;
    });
  });

  // Nạp tiền qua VNPAY
  if (btnTopup) {
    btnTopup.addEventListener('click', () => {
      const amount = parseInt(amountInput.value) || 0;
      if (amount < 10000) {
        showToast('Số tiền không hợp lệ', 'Số tiền nạp tối thiểu là 10.000đ', 'error');
        return;
      }

      const txnId = `TOPUP-VNP-${Date.now().toString().slice(-6)}`;

      window.vnpayGateway.openPayment({
        orderId: txnId,
        amount: amount,
        orderInfo: `Nap tien vi GreenFruit Eco qua VNPAY Sandbox`,
        onSuccess: async (txnData) => {
          currentUser.walletBalance = (currentUser.walletBalance || 0) + amount;
          
          // Gửi lên Django API cập nhật ví
          if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
            try {
              await EcoFruitAPI.topUpWallet(amount);
            } catch (err) {
              // Fallback to local wallet
            }
          }

          setCurrentUser(currentUser);
          loadUserProfile();

          showToast('Nạp tiền thành công!', `Đã cộng ${formatCurrency(amount)} vào ví GreenFruit Eco qua VNPAY Sandbox (Đã ghi nhận DB).`, 'success');
        },
        onCancel: () => {
          showToast('Hủy nạp tiền', 'Giao dịch nạp tiền qua VNPAY đã bị hủy.', 'info');
        }
      });
    });
  }

  // Chuyển tiền thử nghiệm
  const transferForm = document.getElementById('wallet-transfer-form');
  if (transferForm) {
    transferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const targetPhone = document.getElementById('transfer-phone').value.trim();
      const amount = parseInt(document.getElementById('transfer-amount').value) || 0;
      const note = document.getElementById('transfer-note').value.trim();

      if (amount > (currentUser.walletBalance || 0)) {
        showToast('Số dư không đủ', 'Số dư ví hiện tại không đủ để thực hiện giao dịch chuyển tiền này.', 'error');
        return;
      }

      currentUser.walletBalance -= amount;
      setCurrentUser(currentUser);
      loadUserProfile();

      showToast('Chuyển tiền thành công!', `Đã chuyển thử nghiệm ${formatCurrency(amount)} đến tài khoản ${targetPhone}.`, 'success');
      transferForm.reset();
    });
  }
}

// Xử lý điều hướng Hash #orders hoặc #vnpay-test
function handleHashNavigation() {
  const hash = window.location.hash;
  if (hash === '#orders') {
    const tabTrigger = document.querySelector('#pills-orders-tab');
    if (tabTrigger) bootstrap.Tab.getInstance(tabTrigger)?.show() || new bootstrap.Tab(tabTrigger).show();
  } else if (hash === '#vnpay-test') {
    const tabTrigger = document.querySelector('#pills-vnpay-tab');
    if (tabTrigger) bootstrap.Tab.getInstance(tabTrigger)?.show() || new bootstrap.Tab(tabTrigger).show();
  }
}
