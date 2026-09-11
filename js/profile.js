/**
 * GreenFruit Eco - User Profile & Order Management Logic
 * Xử lý thông tin cá nhân, lịch sử đơn hàng, bộ lọc ngày/mã đơn, hủy đơn kèm chọn lý do / đổi địa chỉ,
 * quy tắc mua lại đơn đã hủy trong 24h, nạp tiền ví & chuyển tiền thử nghiệm qua VNPAY.
 */

let currentUser = null;
let currentOrderFilter = 'all';
let filterDateFrom = '';
let filterDateTo = '';
let filterSearchCode = '';
let cachedOrdersList = [];

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  setupProfileForm();
  setupOrderHistoryTabsAndFilters();
  setupVNPaySandboxWallet();
  handleHashNavigation();
});

// Lắng nghe sự kiện đồng bộ dữ liệu từ Django API
window.addEventListener('ecofruit:data-synced', () => {
  console.log('[Profile] Đồng bộ thông tin từ API Backend');
  loadUserProfile();
});

// ==================== HÀM TIỆN ÍCH XỬ LÝ NGÀY & QUY TẮC 24H ====================
function parseOrderDateObj(order) {
  if (order.created_at) {
    const d = new Date(order.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (order.date) {
    const parts = String(order.date).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (parts) {
      const day = parseInt(parts[1]);
      const month = parseInt(parts[2]) - 1;
      const year = parseInt(parts[3]);
      const hour = parseInt(parts[4] || '0');
      const min = parseInt(parts[5] || '0');
      const sec = parseInt(parts[6] || '0');
      return new Date(year, month, day, hour, min, sec);
    }
    const d = new Date(order.date);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Kiểm tra đơn đã hủy có còn trong thời hạn 24h để mua lại hay không
function checkCancelledOrderReorderable(order) {
  const statusKey = (order.status || '').toLowerCase();
  if (statusKey !== 'cancelled') {
    return { allowed: true };
  }
  
  // Thời điểm tính: ưu tiên cancelled_at, fallback created_at / date
  const cancelTime = order.cancelled_at ? new Date(order.cancelled_at).getTime() : parseOrderDateObj(order).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - cancelTime);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  if (elapsedHours <= 24) {
    const remainingHours = Math.max(1, Math.ceil(24 - elapsedHours));
    return { allowed: true, remainingHours };
  } else {
    return { allowed: false, elapsedHours: Math.floor(elapsedHours) };
  }
}

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

// ==================== BỘ LỌC ĐƠN HÀNG (TRẠNG THÁI, NGÀY ĐẶT, TÌM KIẾM) ====================
function setupOrderHistoryTabsAndFilters() {
  // 1. Filter theo Status
  const filterBtns = document.querySelectorAll('.order-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderFilter = btn.dataset.status;
      renderOrderHistory();
    });
  });

  // 2. Tìm kiếm mã đơn hàng (Live search)
  const searchInput = document.getElementById('order-search-code');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterSearchCode = searchInput.value.trim().toLowerCase();
      renderOrderHistory();
    });
  }

  // 3. Nút áp dụng lọc ngày
  const btnApplyFilter = document.getElementById('btn-apply-order-filters');
  const dateFromInput = document.getElementById('order-date-from');
  const dateToInput = document.getElementById('order-date-to');

  if (btnApplyFilter) {
    btnApplyFilter.addEventListener('click', () => {
      filterDateFrom = dateFromInput ? dateFromInput.value : '';
      filterDateTo = dateToInput ? dateToInput.value : '';
      renderOrderHistory();
    });
  }

  // 4. Nút reset bộ lọc ngày
  const btnResetFilter = document.getElementById('btn-reset-order-filters');
  if (btnResetFilter) {
    btnResetFilter.addEventListener('click', () => {
      if (dateFromInput) dateFromInput.value = '';
      if (dateToInput) dateToInput.value = '';
      if (searchInput) searchInput.value = '';
      filterDateFrom = '';
      filterDateTo = '';
      filterSearchCode = '';
      document.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
      const allQuick = document.querySelector('.quick-date-btn[data-days="all"]');
      if (allQuick) allQuick.classList.add('active');
      renderOrderHistory();
    });
  }

  // 5. Chọn nhanh khoảng ngày
  const quickDateBtns = document.querySelectorAll('.quick-date-btn');
  quickDateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      quickDateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const days = btn.dataset.days;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (days === 'all') {
        filterDateFrom = '';
        filterDateTo = '';
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
      } else if (days === '0') {
        filterDateFrom = todayStr;
        filterDateTo = todayStr;
        if (dateFromInput) dateFromInput.value = todayStr;
        if (dateToInput) dateToInput.value = todayStr;
      } else {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - parseInt(days));
        const pastDateStr = pastDate.toISOString().split('T')[0];
        filterDateFrom = pastDateStr;
        filterDateTo = todayStr;
        if (dateFromInput) dateFromInput.value = pastDateStr;
        if (dateToInput) dateToInput.value = todayStr;
      }
      renderOrderHistory();
    });
  });
}

// ==================== RENDER DANH SÁCH ĐƠN HÀNG ====================
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
            created_at: o.created_at,
            cancelled_at: o.cancelled_at,
            status: statusKey,
            statusText: o.order_status_display || o.status_display || orderSt,
            badgeColor: badge,
            customerName: o.customer_name || currentUser?.fullName || '',
            customerPhone: o.customer_phone || currentUser?.phone || '',
            shippingAddress: o.delivery_address || '',
            note: o.delivery_note || '',
            items: (o.items || []).map(item => ({
              id: String(item.product || item.product_id || ''),
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
            trackingCode: o.tracking_code || `VNPOST-${o.order_code}`
          };
        });
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
      }
    } catch (err) {
      console.debug('[Orders API] Local orders fallback:', err.message);
    }
  }

  cachedOrdersList = orders;

  // 1. Lọc theo trạng thái
  if (currentOrderFilter !== 'all') {
    orders = orders.filter(o => o.status === currentOrderFilter);
  }

  // 2. Lọc theo mã đơn hàng tìm kiếm
  if (filterSearchCode) {
    orders = orders.filter(o => {
      const codeStr = String(o.id || o.order_code || '').toLowerCase();
      return codeStr.includes(filterSearchCode);
    });
  }

  // 3. Lọc theo khoảng ngày đặt hàng
  if (filterDateFrom || filterDateTo) {
    orders = orders.filter(o => {
      const orderDateObj = parseOrderDateObj(o);
      const orderYMD = orderDateObj.toISOString().split('T')[0];

      if (filterDateFrom && filterDateTo) {
        return orderYMD >= filterDateFrom && orderYMD <= filterDateTo;
      } else if (filterDateFrom) {
        return orderYMD >= filterDateFrom;
      } else if (filterDateTo) {
        return orderYMD <= filterDateTo;
      }
      return true;
    });
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 bg-light rounded-4 border">
        <i class="fa-solid fa-box-open text-muted fs-1 mb-3"></i>
        <h5 class="fw-bold mb-1">Không tìm thấy đơn hàng phù hợp</h5>
        <p class="text-muted small">Không có đơn hàng nào khớp với tiêu chí tìm kiếm hoặc bộ lọc ngày bạn chọn.</p>
        <button type="button" class="btn btn-outline-secondary btn-sm mt-2" onclick="document.getElementById('btn-reset-order-filters')?.click()">
          <i class="fa-solid fa-rotate-left me-1"></i> Xóa bộ lọc & Xem tất cả
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  orders.forEach(order => {
    const isCancellable = order.status === 'pending' || order.status === 'shipping';
    const reorderStatus = checkCancelledOrderReorderable(order);

    let reorderButtonHTML = '';
    if (order.status === 'cancelled') {
      if (reorderStatus.allowed) {
        reorderButtonHTML = `
          <button type="button" class="btn btn-outline-gf btn-sm" onclick="reOrderItems('${order.id}')" title="Mua lại đơn đã hủy (Còn ${reorderStatus.remainingHours} giờ)">
            <i class="fa-solid fa-rotate-right me-1"></i> Mua lại <small class="badge bg-warning text-dark py-0 ms-1">${reorderStatus.remainingHours}h</small>
          </button>
        `;
      } else {
        reorderButtonHTML = `
          <button type="button" class="btn btn-light btn-sm text-muted border" disabled title="Đơn đã hủy quá 24h, không thể mua lại">
            <i class="fa-solid fa-ban me-1"></i> Quá hạn mua lại
          </button>
        `;
      }
    } else {
      reorderButtonHTML = `
        <button type="button" class="btn btn-outline-gf btn-sm" onclick="reOrderItems('${order.id}')" title="Đặt lại các sản phẩm này">
          <i class="fa-solid fa-rotate-right me-1"></i> Mua lại
        </button>
      `;
    }

    html += `
      <div class="order-card">
        <div class="order-header">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="fw-bold text-primary font-heading fs-6">#${order.id}</span>
            <small class="text-muted"><i class="fa-regular fa-clock me-1"></i>${order.date}</small>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${order.badgeColor || 'bg-secondary'} px-2 py-1">${order.statusText}</span>
            <button type="button" class="btn btn-outline-gf btn-sm btn-view-order-detail" onclick="openOrderDetailModal('${order.id}')" title="Xem chi tiết đầy đủ đơn hàng">
              <i class="fa-solid fa-receipt me-1"></i> Chi tiết
            </button>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 mt-1">
          <div>
            <small class="text-muted d-block">Hình thức: <strong>${order.paymentMethod}</strong> (${order.paymentStatus})</small>
            <small class="text-muted d-block mt-1">Vận đơn: <code class="text-danger-emphasis">${order.trackingCode}</code></small>
          </div>
          <div class="text-end">
            <span class="text-muted small">Tổng tiền: </span>
            <strong class="text-danger font-heading fs-5">${formatCurrency(order.total)}</strong>
            <div class="mt-2 d-flex gap-2 justify-content-end flex-wrap">
              ${isCancellable ? `
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="openUpdateAddressModal('${order.id}')" title="Cập nhật địa chỉ nhận hàng">
                  <i class="fa-solid fa-location-pen me-1"></i> Đổi địa chỉ
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="openCancelOrderModal('${order.id}')" title="Hủy đơn hàng này">
                  <i class="fa-solid fa-ban me-1"></i> Hủy đơn
                </button>
              ` : ''}
              <button type="button" class="btn btn-outline-secondary btn-sm" onclick="openOrderDetailModal('${order.id}')">
                <i class="fa-regular fa-eye me-1"></i> Xem chi tiết
              </button>
              ${reorderButtonHTML}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==================== POPUP XEM CHI TIẾT ĐƠN HÀNG ====================
async function openOrderDetailModal(orderId) {
  let orders = getOrders();
  let order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));

  // Nếu có API Django, fetch chi tiết mới nhất
  if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
    try {
      const apiDetail = await EcoFruitAPI.getOrderDetail(orderId);
      if (apiDetail) {
        let badge = 'bg-warning text-dark';
        let statusKey = 'pending';
        const orderSt = apiDetail.order_status || 'PENDING';
        if (orderSt === 'COMPLETED') { badge = 'bg-success'; statusKey = 'completed'; }
        else if (orderSt === 'SHIPPING' || orderSt === 'PROCESSING') { badge = 'bg-primary'; statusKey = 'shipping'; }
        else if (orderSt === 'CANCELLED') { badge = 'bg-danger'; statusKey = 'cancelled'; }

        order = {
          id: apiDetail.order_code,
          date: new Date(apiDetail.created_at).toLocaleString('vi-VN'),
          created_at: apiDetail.created_at,
          cancelled_at: apiDetail.cancelled_at,
          status: statusKey,
          statusText: apiDetail.order_status_display || orderSt,
          badgeColor: badge,
          customerName: apiDetail.customer_name || (currentUser ? currentUser.fullName : 'Khách hàng'),
          customerPhone: apiDetail.customer_phone || (currentUser ? currentUser.phone : ''),
          customerEmail: apiDetail.customer_email || (currentUser ? currentUser.email : ''),
          shippingAddress: apiDetail.delivery_address || 'Địa chỉ giao hàng',
          note: apiDetail.delivery_note || 'Không có ghi chú',
          paymentMethod: apiDetail.payment_method_display || apiDetail.payment_method,
          paymentStatus: apiDetail.payment_status_display || apiDetail.payment_status,
          trackingCode: apiDetail.tracking_code || `VNPOST-${apiDetail.order_code}`,
          subtotal: Number(apiDetail.subtotal || 0),
          shippingFee: Number(apiDetail.shipping_fee || 0),
          discount: Number(apiDetail.discount_amount || 0),
          total: Number(apiDetail.total_amount || 0),
          items: (apiDetail.items || []).map(item => ({
            id: String(item.product || item.product_id || ''),
            name: item.product_name,
            price: Number(item.unit_price),
            qty: item.quantity,
            unit: item.unit || 'kg',
            image: item.product_image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=100&q=80'
          }))
        };
      }
    } catch (err) {
      console.debug('[OrderDetail API] Fallback to local:', err.message);
    }
  }

  if (!order) {
    showToast('Lỗi', 'Không tìm thấy thông tin đơn hàng này.', 'error');
    return;
  }

  const isCancellable = order.status === 'pending' || order.status === 'shipping';
  const reorderStatus = checkCancelledOrderReorderable(order);

  let itemsRowsHTML = '';
  (order.items || []).forEach(item => {
    const targetId = item.id || item.product_id || item.product || 'sp-01';
    const itemImg = item.image || item.product_image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=100&q=80';
    const itemName = item.name || item.product_name || 'Hoa quả sạch EcoFruit';
    const itemPrice = Number(item.price || item.unit_price || 0);
    const itemQty = Number(item.qty || item.quantity || 1);
    const itemTotal = itemPrice * itemQty;

    itemsRowsHTML += `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <a href="product-detail.html?id=${encodeURIComponent(targetId)}" class="order-item-thumb-link" title="Bấm xem chi tiết ${itemName}">
              <img src="${itemImg}" alt="${itemName}" class="order-item-thumb" style="width: 55px; height: 55px;">
            </a>
            <div>
              <a href="product-detail.html?id=${encodeURIComponent(targetId)}" class="order-item-title-link fs-6" title="Bấm xem chi tiết ${itemName}">
                ${itemName}
              </a>
              <div class="small text-muted mt-1">Đơn vị: ${item.unit || 'kg'}</div>
            </div>
          </div>
        </td>
        <td class="text-center font-heading">${formatCurrency(itemPrice)}</td>
        <td class="text-center fw-bold">x ${itemQty}</td>
        <td class="text-end fw-bold text-dark font-heading">${formatCurrency(itemTotal)}</td>
      </tr>
    `;
  });

  const modalHTML = `
    <div class="modal fade" id="order-detail-view-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header bg-success text-white py-3 px-4">
            <div>
              <h5 class="modal-title fw-bold mb-0 text-white">
                <i class="fa-solid fa-receipt me-2"></i> Chi Tiết Đơn Hàng #${order.id}
              </h5>
              <small class="text-white-50">Ngày đặt: ${order.date}</small>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body p-4">
            
            <!-- Trạng thái & Mã vận đơn -->
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3 bg-light rounded-3 border mb-4">
              <div>
                <span class="text-muted small me-2">Trạng thái:</span>
                <span class="badge ${order.badgeColor || 'bg-success'} fs-6">${order.statusText}</span>
              </div>
              <div>
                <span class="text-muted small me-2">Mã vận đơn:</span>
                <code class="fw-bold fs-6">${order.trackingCode || `VNPOST-${order.id}`}</code>
              </div>
            </div>

            <!-- Bảng sản phẩm trong đơn -->
            <div class="mb-4">
              <h6 class="fw-bold text-dark mb-2">
                <i class="fa-solid fa-basket-shopping text-success me-2"></i> Danh Sách Sản Phẩm (${(order.items || []).length} món)
              </h6>
              <div class="table-responsive border rounded-3">
                <table class="table order-detail-modal-table mb-0">
                  <thead>
                    <tr>
                      <th>Sản phẩm (Bấm vào ảnh để xem)</th>
                      <th class="text-center">Đơn giá</th>
                      <th class="text-center">Số lượng</th>
                      <th class="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRowsHTML}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Thông tin người nhận & Thanh toán -->
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <div class="order-info-pill h-100">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold text-dark mb-0"><i class="fa-solid fa-location-dot text-danger me-2"></i> Địa Chỉ Nhận Hàng</h6>
                    ${isCancellable ? `
                      <button type="button" class="btn btn-sm btn-link text-primary p-0 text-decoration-none" onclick="bootstrap.Modal.getInstance(document.getElementById('order-detail-view-modal'))?.hide(); openUpdateAddressModal('${order.id}');">
                        <i class="fa-solid fa-pen-to-square"></i> Sửa
                      </button>
                    ` : ''}
                  </div>
                  <div class="small">
                    <div><strong>${order.customerName || (currentUser ? currentUser.fullName : 'Khách hàng')}</strong> - ${order.customerPhone || (currentUser ? currentUser.phone : '')}</div>
                    <div class="text-muted mt-1">${order.shippingAddress || 'Hà Nội'}</div>
                    ${order.note ? `<div class="text-muted mt-1"><em>Ghi chú: ${order.note}</em></div>` : ''}
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="order-info-pill h-100">
                  <h6 class="fw-bold text-dark mb-2"><i class="fa-solid fa-credit-card text-primary me-2"></i> Thanh Toán & Chi Phí</h6>
                  <div class="small">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="text-muted">Hình thức:</span>
                      <strong>${order.paymentMethod || 'COD'}</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                      <span class="text-muted">Trạng thái thanh toán:</span>
                      <span class="badge bg-success-subtle text-success">${order.paymentStatus || 'Đã thanh toán'}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                      <span class="text-muted">Tiền hàng:</span>
                      <span>${formatCurrency(order.subtotal || order.total)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                      <span class="text-muted">Phí giao hàng:</span>
                      <span>${order.shippingFee === 0 ? '<span class="text-success font-weight-bold">Miễn phí</span>' : formatCurrency(order.shippingFee)}</span>
                    </div>
                    ${order.discount > 0 ? `
                      <div class="d-flex justify-content-between mb-1 text-danger">
                        <span>Giảm giá:</span>
                        <strong>-${formatCurrency(order.discount)}</strong>
                      </div>
                    ` : ''}
                    <div class="d-flex justify-content-between pt-2 mt-2 border-top">
                      <strong class="text-dark">Tổng thanh toán:</strong>
                      <strong class="text-danger fs-5 font-heading">${formatCurrency(order.total)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div class="modal-footer bg-light py-2 px-4 d-flex justify-content-between flex-wrap gap-2">
            <div>
              ${isCancellable ? `
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="bootstrap.Modal.getInstance(document.getElementById('order-detail-view-modal'))?.hide(); openCancelOrderModal('${order.id}');">
                  <i class="fa-solid fa-ban me-1"></i> Hủy đơn hàng này
                </button>
              ` : ''}
            </div>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-secondary-gf" data-bs-dismiss="modal">Đóng</button>
              ${order.status === 'cancelled' ? (reorderStatus.allowed ? `
                <button type="button" class="btn btn-primary-gf" onclick="reOrderItems('${order.id}')">
                  <i class="fa-solid fa-rotate-right me-1"></i> Mua lại đơn này (Còn ${reorderStatus.remainingHours}h)
                </button>
              ` : `
                <button type="button" class="btn btn-secondary" disabled title="Đơn đã hủy quá 24h">
                  <i class="fa-solid fa-ban me-1"></i> Quá hạn mua lại (>24h)
                </button>
              `) : `
                <button type="button" class="btn btn-primary-gf" onclick="reOrderItems('${order.id}')">
                  <i class="fa-solid fa-rotate-right me-1"></i> Mua lại toàn bộ đơn này
                </button>
              `}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  let existingModal = document.getElementById('order-detail-view-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('order-detail-view-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}
window.openOrderDetailModal = openOrderDetailModal;

// ==================== POPUP HỦY ĐƠN HÀNG KÈM CHỌN LÝ DO & ĐỔI ĐỊA CHỈ ====================
function openCancelOrderModal(orderId) {
  let orders = getOrders();
  let order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (!order) {
    showToast('Lỗi', 'Không tìm thấy đơn hàng.', 'error');
    return;
  }

  const currentAddress = order.shippingAddress || (currentUser ? currentUser.address : '');
  const currentPhone = order.customerPhone || (currentUser ? currentUser.phone : '');
  const currentName = order.customerName || (currentUser ? currentUser.fullName : '');

  const modalHTML = `
    <div class="modal fade" id="cancel-order-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header bg-danger text-white py-3 px-4">
            <h5 class="modal-title fw-bold mb-0 text-white">
              <i class="fa-solid fa-triangle-exclamation me-2"></i> Xác Nhận Hủy Đơn Hàng #${order.id}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body p-4">
            <p class="text-dark small mb-3">
              Quý khách có chắc chắn muốn hủy đơn hàng này không? Vui lòng cho GreenFruit biết lý do bạn muốn hủy:
            </p>

            <!-- Danh sách lý do hủy -->
            <div class="d-flex flex-column gap-2 mb-3">
              <label class="form-check p-2 border rounded-3 bg-light cursor-pointer">
                <input class="form-check-input ms-1 me-2" type="radio" name="cancelReason" value="change_address" id="reason-change-address" onchange="handleCancelReasonChange(this.value)">
                <span class="form-check-label small fw-bold text-dark">
                  <i class="fa-solid fa-location-dot text-danger me-1"></i> Tôi muốn thay đổi địa chỉ nhận hàng
                </span>
              </label>

              <label class="form-check p-2 border rounded-3 bg-light cursor-pointer">
                <input class="form-check-input ms-1 me-2" type="radio" name="cancelReason" value="change_items" onchange="handleCancelReasonChange(this.value)">
                <span class="form-check-label small fw-bold text-dark">
                  <i class="fa-solid fa-basket-shopping text-success me-1"></i> Tôi muốn thay đổi sản phẩm hoặc số lượng
                </span>
              </label>

              <label class="form-check p-2 border rounded-3 bg-light cursor-pointer">
                <input class="form-check-input ms-1 me-2" type="radio" name="cancelReason" value="better_price" onchange="handleCancelReasonChange(this.value)">
                <span class="form-check-label small fw-bold text-dark">
                  <i class="fa-solid fa-tags text-warning me-1"></i> Tìm thấy giá tốt hơn / Ưu đãi ở nơi khác
                </span>
              </label>

              <label class="form-check p-2 border rounded-3 bg-light cursor-pointer">
                <input class="form-check-input ms-1 me-2" type="radio" name="cancelReason" value="not_needed" onchange="handleCancelReasonChange(this.value)" checked>
                <span class="form-check-label small fw-bold text-dark">
                  <i class="fa-solid fa-ban text-muted me-1"></i> Đổi ý, không còn nhu cầu mua nữa
                </span>
              </label>

              <label class="form-check p-2 border rounded-3 bg-light cursor-pointer">
                <input class="form-check-input ms-1 me-2" type="radio" name="cancelReason" value="other" onchange="handleCancelReasonChange(this.value)">
                <span class="form-check-label small fw-bold text-dark">
                  <i class="fa-solid fa-comment-dots text-primary me-1"></i> Lý do khác
                </span>
              </label>
            </div>

            <!-- Khung cập nhật địa chỉ nhanh nếu chọn lý do đổi địa chỉ -->
            <div id="cancel-address-update-box" class="d-none alert alert-warning border border-warning-subtle p-3 rounded-3 mb-3">
              <div class="fw-bold text-dark small mb-2">
                <i class="fa-solid fa-wand-magic-sparkles text-warning me-1"></i> Bạn không cần phải hủy đơn! Cập nhật địa chỉ nhận mới ngay tại đây:
              </div>
              <div class="mb-2">
                <label class="form-label small fw-bold mb-1">Họ tên người nhận:</label>
                <input type="text" class="form-control form-control-sm" id="cancel-update-name" value="${currentName}">
              </div>
              <div class="mb-2">
                <label class="form-label small fw-bold mb-1">Số điện thoại:</label>
                <input type="tel" class="form-control form-control-sm" id="cancel-update-phone" value="${currentPhone}">
              </div>
              <div class="mb-2">
                <label class="form-label small fw-bold mb-1">Địa chỉ nhận hàng mới:</label>
                <textarea class="form-control form-control-sm" id="cancel-update-address" rows="2" placeholder="Nhập địa chỉ nhận hàng chính xác...">${currentAddress}</textarea>
              </div>
              <button type="button" class="btn btn-success-gf btn-sm w-100 mt-2" onclick="saveAddressAndKeepOrder('${order.id}')">
                <i class="fa-solid fa-floppy-disk me-1"></i> Lưu địa chỉ mới & Giữ nguyên đơn hàng
              </button>
            </div>

            <!-- Khung nhập lý do tùy chỉnh -->
            <div id="cancel-custom-reason-box" class="d-none mb-3">
              <label class="form-label small fw-bold mb-1">Vui lòng ghi rõ lý do:</label>
              <textarea class="form-control form-control-sm" id="cancel-custom-reason-text" rows="2" placeholder="Góp ý lý do hủy để GreenFruit phục vụ tốt hơn..."></textarea>
            </div>

          </div>

          <div class="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
            <button type="button" class="btn btn-secondary-gf btn-sm" data-bs-dismiss="modal">Đóng, giữ đơn</button>
            <button type="button" class="btn btn-danger btn-sm px-3" onclick="confirmCancelOrder('${order.id}')">
              <i class="fa-solid fa-check me-1"></i> Xác nhận hủy đơn
            </button>
          </div>

        </div>
      </div>
    </div>
  `;

  let existingModal = document.getElementById('cancel-order-modal');
  if (existingModal) existingModal.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('cancel-order-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}
window.openCancelOrderModal = openCancelOrderModal;

function handleCancelReasonChange(val) {
  const addressBox = document.getElementById('cancel-address-update-box');
  const customBox = document.getElementById('cancel-custom-reason-box');

  if (addressBox) {
    if (val === 'change_address') {
      addressBox.classList.remove('d-none');
    } else {
      addressBox.classList.add('d-none');
    }
  }

  if (customBox) {
    if (val === 'other') {
      customBox.classList.remove('d-none');
    } else {
      customBox.classList.add('d-none');
    }
  }
}
window.handleCancelReasonChange = handleCancelReasonChange;

// Lưu địa chỉ mới và giữ đơn
async function saveAddressAndKeepOrder(orderId) {
  const newName = document.getElementById('cancel-update-name')?.value.trim() || '';
  const newPhone = document.getElementById('cancel-update-phone')?.value.trim() || '';
  const newAddress = document.getElementById('cancel-update-address')?.value.trim() || '';

  if (!newAddress) {
    showToast('Lỗi', 'Vui lòng nhập địa chỉ nhận hàng mới.', 'error');
    return;
  }

  // 1. Gọi API Backend nếu có
  if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
    try {
      await EcoFruitAPI.updateOrderAddress(orderId, {
        customer_name: newName,
        customer_phone: newPhone,
        delivery_address: newAddress
      });
    } catch (err) {
      console.debug('[UpdateAddress API] fallback:', err.message);
    }
  }

  // 2. Cập nhật local storage
  let orders = getOrders();
  const order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (order) {
    order.shippingAddress = newAddress;
    if (newName) order.customerName = newName;
    if (newPhone) order.customerPhone = newPhone;
    localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
  }

  const modalEl = document.getElementById('cancel-order-modal');
  if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

  showToast('Đã đổi địa chỉ thành công!', `Địa chỉ nhận cho đơn #${orderId} đã được cập nhật sang: ${newAddress}`, 'success');
  await renderOrderHistory();
}
window.saveAddressAndKeepOrder = saveAddressAndKeepOrder;

// Xác nhận hủy đơn hàng
async function confirmCancelOrder(orderId) {
  const selectedRadio = document.querySelector('input[name="cancelReason"]:checked');
  let reason = 'Đổi ý không mua nữa';
  if (selectedRadio) {
    const val = selectedRadio.value;
    if (val === 'change_address') reason = 'Muốn thay đổi địa chỉ nhận hàng';
    else if (val === 'change_items') reason = 'Muốn thay đổi sản phẩm/số lượng';
    else if (val === 'better_price') reason = 'Tìm thấy giá tốt hơn ở nơi khác';
    else if (val === 'not_needed') reason = 'Đổi ý không còn nhu cầu mua nữa';
    else if (val === 'other') {
      const customText = document.getElementById('cancel-custom-reason-text')?.value.trim();
      reason = customText || 'Lý do cá nhân khác';
    }
  }

  // 1. Gửi request hủy lên Django Backend
  if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
    try {
      await EcoFruitAPI.cancelOrder(orderId, reason);
    } catch (err) {
      console.debug('[CancelOrder API] fallback:', err.message);
    }
  }

  // 2. Cập nhật trạng thái đơn hàng local
  let orders = getOrders();
  const order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (order) {
    order.status = 'cancelled';
    order.statusText = 'Đã hủy đơn';
    order.badgeColor = 'bg-danger';
    order.cancelled_at = new Date().toISOString();
    localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
  }

  const modalEl = document.getElementById('cancel-order-modal');
  if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

  showToast('Đã hủy đơn hàng', `Đơn hàng #${orderId} đã được hủy thành công. Lý do: ${reason}`, 'info');
  await renderOrderHistory();
}
window.confirmCancelOrder = confirmCancelOrder;

// ==================== POPUP ĐỔI ĐỊA CHỈ NHẬN HÀNG TRỰC TIẾP ====================
function openUpdateAddressModal(orderId) {
  let orders = getOrders();
  let order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (!order) return;

  const currentAddress = order.shippingAddress || (currentUser ? currentUser.address : '');
  const currentPhone = order.customerPhone || (currentUser ? currentUser.phone : '');
  const currentName = order.customerName || (currentUser ? currentUser.fullName : '');

  const modalHTML = `
    <div class="modal fade" id="update-address-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header bg-primary text-white py-3 px-4">
            <h5 class="modal-title fw-bold mb-0 text-white">
              <i class="fa-solid fa-location-dot me-2"></i> Cập Nhật Địa Chỉ Nhận Đơn #${order.id}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label small fw-bold">Họ và tên người nhận:</label>
              <input type="text" class="form-control" id="direct-update-name" value="${currentName}" required>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Số điện thoại liên hệ:</label>
              <input type="tel" class="form-control" id="direct-update-phone" value="${currentPhone}" required>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Địa chỉ nhận hoa quả mới:</label>
              <textarea class="form-control" id="direct-update-address" rows="3" required>${currentAddress}</textarea>
              <small class="text-muted">Shipper sẽ giao trực tiếp đến địa chỉ mới này.</small>
            </div>
          </div>

          <div class="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
            <button type="button" class="btn btn-secondary-gf btn-sm" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary-gf btn-sm" onclick="saveDirectAddressUpdate('${order.id}')">
              <i class="fa-solid fa-floppy-disk me-1"></i> Lưu địa chỉ mới
            </button>
          </div>

        </div>
      </div>
    </div>
  `;

  let existingModal = document.getElementById('update-address-modal');
  if (existingModal) existingModal.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper.firstElementChild);

  const modalEl = document.getElementById('update-address-modal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}
window.openUpdateAddressModal = openUpdateAddressModal;

async function saveDirectAddressUpdate(orderId) {
  const newName = document.getElementById('direct-update-name')?.value.trim() || '';
  const newPhone = document.getElementById('direct-update-phone')?.value.trim() || '';
  const newAddress = document.getElementById('direct-update-address')?.value.trim() || '';

  if (!newAddress) {
    showToast('Lỗi', 'Địa chỉ giao hàng không được để trống.', 'error');
    return;
  }

  // 1. Gọi API Backend
  if (window.EcoFruitAPI && EcoFruitAPI.getToken()) {
    try {
      await EcoFruitAPI.updateOrderAddress(orderId, {
        customer_name: newName,
        customer_phone: newPhone,
        delivery_address: newAddress
      });
    } catch (err) {
      console.debug('[UpdateAddress API] fallback:', err.message);
    }
  }

  // 2. Cập nhật local
  let orders = getOrders();
  const order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (order) {
    order.shippingAddress = newAddress;
    if (newName) order.customerName = newName;
    if (newPhone) order.customerPhone = newPhone;
    localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
  }

  const modalEl = document.getElementById('update-address-modal');
  if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

  showToast('Cập nhật thành công!', `Địa chỉ giao hàng cho đơn #${orderId} đã được cập nhật.`, 'success');
  await renderOrderHistory();
}
window.saveDirectAddressUpdate = saveDirectAddressUpdate;

// ==================== MUA LẠI ĐƠN HÀNG (ÁP DỤNG QUY TẮC 24H CHO ĐƠN ĐÃ HỦY) ====================
function reOrderItems(orderId) {
  const orders = getOrders();
  const order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (!order) return;

  // Kiểm tra quy tắc 24h nếu đơn hàng đã hủy
  const reorderStatus = checkCancelledOrderReorderable(order);
  if (!reorderStatus.allowed) {
    showToast('Không thể mua lại', 'Đơn hàng này đã bị hủy quá 24 giờ nên không thể mua lại.', 'error');
    return;
  }

  order.items.forEach(item => {
    addToCart(item.id || item.product || item.product_id, item.qty || item.quantity || 1, item.unit);
  });

  showToast('Đã thêm vào giỏ!', `Đã nạp toàn bộ sản phẩm từ đơn #${order.id} vào giỏ hàng của bạn.`, 'success');
  setTimeout(() => {
    window.location.href = 'cart.html';
  }, 800);
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
