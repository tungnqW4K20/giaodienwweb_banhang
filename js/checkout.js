/**
 * GreenFruit Eco - Checkout & Order Processing Logic
 * Xử lý thông tin giao hàng, lựa chọn COD, VietQR và tích hợp cổng thanh toán VNPay Sandbox.
 */

let checkoutData = {
  cart: [],
  subtotal: 0,
  shippingFee: 0,
  discount: 0,
  total: 0,
  appliedVoucher: null,
  selectedPayment: 'COD'
};

document.addEventListener('DOMContentLoaded', () => {
  initCheckoutPage();
  setupPaymentMethodCards();
  setupCheckoutForm();
});

// ==================== KHỞI TẠO TRANG CHECKOUT ====================
function initCheckoutPage() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Giỏ hàng trống', 'Vui lòng chọn sản phẩm trước khi thanh toán.', 'info');
    setTimeout(() => {
      window.location.href = 'products.html';
    }, 1000);
    return;
  }

  checkoutData.cart = cart;

  // Tự động điền thông tin nếu đã đăng nhập
  const currentUser = getCurrentUser();
  if (currentUser) {
    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const emailInput = document.getElementById('checkout-email');
    const addressInput = document.getElementById('checkout-address');

    if (nameInput) nameInput.value = currentUser.fullName || '';
    if (phoneInput) phoneInput.value = currentUser.phone || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (addressInput) addressInput.value = currentUser.address || '';
  }

  // Đọc voucher nếu có
  try {
    const savedVoucher = localStorage.getItem('gf_applied_voucher');
    if (savedVoucher) {
      checkoutData.appliedVoucher = JSON.parse(savedVoucher);
    }
  } catch (e) {
    checkoutData.appliedVoucher = null;
  }

  calculateAndRenderOrderSummary();
}

// Tính toán & Render Tóm Tắt Đơn Hàng
function calculateAndRenderOrderSummary() {
  let subtotal = 0;
  let itemsHTML = '';

  checkoutData.cart.forEach(item => {
    const product = getProductById(item.id);
    if (!product) return;

    const itemTotal = product.price * item.qty;
    subtotal += itemTotal;

    itemsHTML += `
      <div class="checkout-mini-item">
        <img src="${product.images[0]}" alt="${product.name}" class="checkout-mini-thumb">
        <div class="flex-grow-1">
          <div class="fw-bold small text-dark">${product.name}</div>
          <small class="text-muted">SL: ${item.qty} ${item.unit || product.unit} x ${formatCurrency(product.price)}</small>
        </div>
        <strong class="text-dark small font-heading">${formatCurrency(itemTotal)}</strong>
      </div>
    `;
  });

  checkoutData.subtotal = subtotal;
  checkoutData.shippingFee = subtotal >= 500000 ? 0 : 30000;
  checkoutData.discount = 0;

  if (checkoutData.appliedVoucher) {
    const check = checkVoucher(checkoutData.appliedVoucher.code, subtotal);
    if (check.success) {
      checkoutData.discount = check.discountAmount;
      if (checkoutData.appliedVoucher.discountType === 'shipping') {
        checkoutData.shippingFee = Math.max(0, checkoutData.shippingFee - checkoutData.discount);
      }
    }
  }

  checkoutData.total = Math.max(0, checkoutData.subtotal + checkoutData.shippingFee - (checkoutData.appliedVoucher?.discountType === 'shipping' ? 0 : checkoutData.discount));

  // Render HTML
  document.getElementById('checkout-items-list').innerHTML = itemsHTML;
  document.getElementById('checkout-subtotal').textContent = formatCurrency(checkoutData.subtotal);
  document.getElementById('checkout-shipping').innerHTML = checkoutData.shippingFee === 0 ? '<strong class="text-success">Miễn phí</strong>' : formatCurrency(checkoutData.shippingFee);
  
  const discountRow = document.getElementById('checkout-discount-row');
  if (checkoutData.discount > 0 && checkoutData.appliedVoucher?.discountType !== 'shipping') {
    discountRow.classList.remove('d-none');
    document.getElementById('checkout-discount').textContent = `-${formatCurrency(checkoutData.discount)}`;
  } else {
    discountRow.classList.add('d-none');
  }

  document.getElementById('checkout-total').textContent = formatCurrency(checkoutData.total);
}

// ==================== LỰA CHỌN PHƯƠNG THỨC THANH TOÁN ====================
function setupPaymentMethodCards() {
  const cards = document.querySelectorAll('.payment-method-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      checkoutData.selectedPayment = radio.value;
    });
  });
}

// ==================== XỬ LÝ ĐẶT HÀNG ====================
function setupCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const email = document.getElementById('checkout-email').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const note = document.getElementById('checkout-note').value.trim();
    const deliveryTime = document.getElementById('checkout-time-slot').value;

    if (!name || !phone || !address) {
      showToast('Thiếu thông tin', 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.', 'error');
      return;
    }

    const orderId = `GF-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderPayload = {
      id: orderId,
      date: new Date().toLocaleString('vi-VN'),
      status: 'pending',
      statusText: 'Chờ xác nhận',
      badgeColor: 'bg-warning text-dark',
      items: checkoutData.cart.map(item => {
        const p = getProductById(item.id);
        return {
          id: item.id,
          name: p ? p.name : 'Hoa quả sạch',
          price: p ? p.price : 0,
          qty: item.qty,
          unit: item.unit || (p ? p.unit : 'kg'),
          image: p ? p.images[0] : ''
        };
      }),
      subtotal: checkoutData.subtotal,
      shippingFee: checkoutData.shippingFee,
      discount: checkoutData.discount,
      total: checkoutData.total,
      paymentMethod: checkoutData.selectedPayment,
      paymentStatus: 'Chưa thanh toán',
      shippingAddress: `${address} (Người nhận: ${name} - ${phone})`,
      note: note,
      deliveryTime: deliveryTime,
      trackingCode: 'Đang tạo vận đơn...'
    };

    // PHƯƠNG THỨC 1: VNPAY SANDBOX
    if (checkoutData.selectedPayment === 'VNPAY') {
      window.vnpayGateway.openPayment({
        orderId: orderId,
        amount: checkoutData.total,
        orderInfo: `Thanh toan don hang ${orderId} tai GreenFruit Eco`,
        onSuccess: (txnData) => {
          orderPayload.status = 'processing';
          orderPayload.statusText = 'Đã thanh toán (Đang chuẩn bị hàng)';
          orderPayload.badgeColor = 'bg-info text-white';
          orderPayload.paymentStatus = 'Đã thanh toán VNPAY';
          orderPayload.vnpayTxn = txnData.vnp_TransactionNo;

          finalizeOrder(orderPayload);
        },
        onCancel: () => {
          showToast('Hủy thanh toán', 'Giao dịch qua VNPAY đã bị hủy. Bạn có thể chọn phương thức khác.', 'info');
        }
      });
      return;
    }

    // PHƯƠNG THỨC 2: CHUYỂN KHOẢN VIETQR
    if (checkoutData.selectedPayment === 'VIETQR') {
      openVietQRModal(orderPayload);
      return;
    }

    // PHƯƠNG THỨC 3: COD
    if (checkoutData.selectedPayment === 'COD') {
      orderPayload.paymentMethod = 'Thanh toán khi nhận hàng (COD)';
      orderPayload.paymentStatus = 'Thu tiền khi giao hàng';
      finalizeOrder(orderPayload);
    }
  });
}

// Hiển thị Popup quét mã VietQR
function openVietQRModal(orderPayload) {
  const qrUrl = `https://img.vietqr.io/image/MB-0909123456-compact2.png?amount=${orderPayload.total}&addInfo=${encodeURIComponent(orderPayload.id)}&accountName=GREENFRUIT%20ECO`;

  let modalEl = document.getElementById('vietqr-checkout-modal');
  if (!modalEl) {
    const modalHTML = `
      <div class="modal fade" id="vietqr-checkout-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg rounded-4 text-center p-4">
            <h4 class="fw-bold mb-1 text-primary"><i class="fa-solid fa-qrcode me-2"></i> Chuyển Khoản Qua VietQR</h4>
            <p class="text-muted small mb-3">Mở ứng dụng Ngân hàng (App Banking) bất kỳ để quét mã thanh toán</p>
            
            <div class="vietqr-box mb-3">
              <img id="vietqr-checkout-img" src="" alt="VietQR GreenFruit" class="img-fluid rounded-3 mb-2" style="max-width: 240px;">
              <div class="small text-start bg-white p-3 rounded-3 border">
                <div>Ngân hàng: <strong>MBBank (Quân Đội)</strong></div>
                <div>Số tài khoản: <strong>0909 123 456</strong></div>
                <div>Chủ tài khoản: <strong>GREENFRUIT ECO STORE</strong></div>
                <div>Số tiền: <strong class="text-danger fs-6" id="vietqr-amount-text">0 đ</strong></div>
                <div>Nội dung CK: <strong class="text-primary" id="vietqr-memo-text">GF-...</strong></div>
              </div>
            </div>

            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary w-50" data-bs-dismiss="modal">Hủy bỏ</button>
              <button type="button" class="btn btn-primary-gf w-50" id="btn-confirm-vietqr-paid">
                <i class="fa-solid fa-circle-check me-1"></i> Tôi đã chuyển khoản
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = modalHTML;
    document.body.appendChild(wrap);
    modalEl = document.getElementById('vietqr-checkout-modal');
  }

  document.getElementById('vietqr-checkout-img').src = qrUrl;
  document.getElementById('vietqr-amount-text').textContent = formatCurrency(orderPayload.total);
  document.getElementById('vietqr-memo-text').textContent = orderPayload.id;

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();

  document.getElementById('btn-confirm-vietqr-paid').onclick = () => {
    bsModal.hide();
    orderPayload.paymentMethod = 'Chuyển khoản VietQR';
    orderPayload.paymentStatus = 'Đã chuyển khoản (Chờ đối soát)';
    finalizeOrder(orderPayload);
  };
}

// Lưu đơn hàng vào Database MySQL qua Django API và hiển thị biên lai thành công
async function finalizeOrder(orderPayload) {
  // 1. Gửi request lưu vào Backend Django / MySQL
  try {
    if (window.EcoFruitAPI) {
      const apiItems = (orderPayload.items || []).map(i => ({
        product_id: parseInt(i.id) || 1,
        quantity: parseInt(i.qty) || 1
      }));

      const dbPayload = {
        customer_name: orderPayload.customerName || 'Khách hàng',
        customer_phone: orderPayload.customerPhone || '0900000000',
        customer_email: orderPayload.customerEmail || '',
        delivery_address: orderPayload.shippingAddress || 'Hà Nội',
        delivery_note: orderPayload.note || '',
        payment_method: orderPayload.paymentMethod?.includes('VNPay') ? 'VNPAY' : (orderPayload.paymentMethod?.includes('VietQR') ? 'BANKING' : 'COD'),
        voucher_code: orderPayload.voucherCode || '',
        items: apiItems
      };

      const res = await window.EcoFruitAPI.checkout(dbPayload);
      if (res && res.data && res.data.order) {
        orderPayload.id = res.data.order.order_code;
        console.log('[EcoFruit Backend] Đã lưu đơn hàng vào MySQL thành công:', orderPayload.id);
      }
    }
  } catch (err) {
    console.warn('[EcoFruit Backend] Gửi backend offline fallback local:', err.message);
  }

  // 2. Lưu vào local storage để đồng bộ UI
  createOrder(orderPayload);
  clearCart();
  localStorage.removeItem('gf_applied_voucher');

  showOrderSuccessReceipt(orderPayload);
}

// Hiển thị Biên lai Đặt hàng Thành công
function showOrderSuccessReceipt(order) {
  let modalEl = document.getElementById('order-receipt-modal');
  if (!modalEl) {
    const modalHTML = `
      <div class="modal fade" id="order-receipt-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="bg-success text-white text-center p-4">
              <div class="rounded-circle bg-white text-success d-inline-flex align-items-center justify-content-center mb-2 shadow" style="width: 65px; height: 65px;">
                <i class="fa-solid fa-check fs-2"></i>
              </div>
              <h3 class="fw-bold mb-1 text-white">Đặt Hàng Thành Công!</h3>
              <p class="mb-0 text-white-50">Cảm ơn bạn đã lựa chọn hoa quả sạch tại GreenFruit Eco.</p>
            </div>
            <div class="modal-body p-4">
              <div class="alert alert-light border d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                  <small class="text-muted d-block">Mã đơn hàng:</small>
                  <strong class="text-primary fs-5 font-heading">${order.id}</strong>
                </div>
                <div>
                  <small class="text-muted d-block">Thời gian:</small>
                  <strong class="text-dark">${order.date}</strong>
                </div>
                <div>
                  <small class="text-muted d-block">Thanh toán:</small>
                  <span class="badge bg-success">${order.paymentStatus}</span>
                </div>
              </div>

              <div class="mb-3">
                <h6 class="fw-bold text-dark mb-2">Thông tin nhận hàng:</h6>
                <p class="text-muted small mb-1"><i class="fa-solid fa-location-dot text-danger me-1"></i> ${order.shippingAddress}</p>
                <p class="text-muted small mb-0"><i class="fa-solid fa-clock text-primary me-1"></i> Thời gian giao: ${order.deliveryTime}</p>
              </div>

              <div class="d-flex justify-content-between align-items-center border-top pt-3">
                <span class="fw-bold fs-5">Tổng số tiền:</span>
                <strong class="text-danger fs-4 font-heading">${formatCurrency(order.total)}</strong>
              </div>
            </div>
            <div class="modal-footer bg-light d-flex justify-content-between p-3">
              <a href="index.html" class="btn btn-outline-secondary">
                <i class="fa-solid fa-house me-1"></i> Về trang chủ
              </a>
              <a href="profile.html#orders" class="btn btn-primary-gf">
                <i class="fa-solid fa-box-open me-1"></i> Xem lịch sử đơn hàng
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = modalHTML;
    document.body.appendChild(wrap);
    modalEl = document.getElementById('order-receipt-modal');
  }

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}
