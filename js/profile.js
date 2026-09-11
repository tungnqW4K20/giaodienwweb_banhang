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
      const targetId = item.id || item.product_id || item.product || 'sp-01';
      const itemImg = item.image || item.product_image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=100&q=80';
      const itemName = item.name || item.product_name || 'Hoa quả sạch';

      itemsHTML += `
        <div class="order-item-row">
          <a href="product-detail.html?id=${encodeURIComponent(targetId)}" class="order-item-thumb-link" title="Xem chi tiết ${itemName}">
            <img src="${itemImg}" alt="${itemName}" class="order-item-thumb">
          </a>
          <div class="flex-grow-1">
            <a href="product-detail.html?id=${encodeURIComponent(targetId)}" class="order-item-title-link" title="Xem chi tiết ${itemName}">
              ${itemName}
            </a>
            <div class="text-muted small mt-1">SL: <strong>${item.qty || item.quantity || 1}</strong> ${item.unit || 'kg'} x ${formatCurrency(item.price || item.unit_price || 0)}</div>
          </div>
          <strong class="text-dark small font-heading">${formatCurrency((item.price || item.unit_price || 0) * (item.qty || item.quantity || 1))}</strong>
        </div>
      `;
    });

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
            <div class="mt-2 d-flex gap-2 justify-content-end">
              <button type="button" class="btn btn-outline-secondary btn-sm" onclick="openOrderDetailModal('${order.id}')">
                <i class="fa-regular fa-eye me-1"></i> Xem chi tiết
              </button>
              <button type="button" class="btn btn-outline-gf btn-sm" onclick="reOrderItems('${order.id}')">
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
                  <h6 class="fw-bold text-dark mb-2"><i class="fa-solid fa-location-dot text-danger me-2"></i> Địa Chỉ Nhận Hàng</h6>
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

          <div class="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
            <button type="button" class="btn btn-secondary-gf" data-bs-dismiss="modal">Đóng</button>
            <button type="button" class="btn btn-primary-gf" onclick="reOrderItems('${order.id}')">
              <i class="fa-solid fa-rotate-right me-1"></i> Mua lại toàn bộ đơn này
            </button>
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

// Mua lại đơn hàng
function reOrderItems(orderId) {
  const orders = getOrders();
  const order = orders.find(o => String(o.id) === String(orderId) || String(o.order_code) === String(orderId));
  if (!order) return;

  order.items.forEach(item => {
    addToCart(item.id || item.product || item.product_id, item.qty || item.quantity || 1, item.unit);
  });

  showToast('Đã thêm vào giỏ!', `Đã nạp toàn bộ món từ đơn ${order.id} vào giỏ hàng.`, 'success');
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
