/**
 * GreenFruit Eco - Shopping Cart Logic
 * Quản lý hiển thị giỏ hàng, tăng giảm số lượng, áp mã voucher giảm giá và tính toán phí vận chuyển.
 */

let appliedVoucher = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAppliedVoucher();
  renderCartPage();
});

// Nạp voucher đã lưu nếu có
function loadAppliedVoucher() {
  try {
    const saved = localStorage.getItem('gf_applied_voucher');
    if (saved) {
      appliedVoucher = JSON.parse(saved);
    }
  } catch (e) {
    appliedVoucher = null;
  }
}

// ==================== RENDER TRANG GIỎ HÀNG ====================
function renderCartPage() {
  const cart = getCart();
  const cartContainer = document.getElementById('cart-page-content');
  
  if (!cartContainer) return;

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="p-5 bg-white rounded-4 border shadow-sm my-4">
          <div class="mb-3">
            <i class="fa-solid fa-basket-shopping text-muted" style="font-size: 70px;"></i>
          </div>
          <h3 class="fw-bold mb-2">Giỏ hàng của bạn đang trống</h3>
          <p class="text-muted mb-4">Hãy chọn những loại hoa quả tươi ngon, giòn ngọt tự nhiên cho gia đình ngay nhé!</p>
          <a href="products.html" class="btn btn-primary-gf px-4 py-3">
            <i class="fa-solid fa-apple-whole me-2"></i> Khám phá hoa quả sạch ngay
          </a>
        </div>
      </div>
    `;
    return;
  }

  // Render bảng sản phẩm và tổng tiền
  let tableRowsHTML = '';
  let subtotal = 0;

  cart.forEach(item => {
    const product = getProductById(item.id);
    if (!product) return;

    const itemTotal = product.price * item.qty;
    subtotal += itemTotal;

    tableRowsHTML += `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <img src="${product.images[0]}" alt="${product.name}" class="cart-product-thumb" loading="lazy">
            <div>
              <div class="cart-product-title">
                <a href="product-detail.html?id=${product.id}">${product.name}</a>
              </div>
              <div class="d-flex align-items-center gap-2 flex-wrap mt-1">
                <span class="badge bg-success-subtle text-success border border-success-subtle small px-2 py-1">
                  <i class="fa-solid fa-shield-halved me-1"></i>${product.cert}
                </span>
                <span class="small text-muted">Xuất xứ: ${product.origin}</span>
              </div>
              <div class="small text-danger fw-bold d-md-none mt-2">
                ${formatCurrency(product.price)} / ${item.unit || product.unit}
              </div>
            </div>
          </div>
        </td>
        <td>
          <div class="cart-unit-price">${formatCurrency(product.price)}</div>
          <small class="text-muted">/${item.unit || product.unit}</small>
        </td>
        <td>
          <div class="quantity-control">
            <button type="button" class="btn-qty" ${item.qty <= 1 ? 'disabled' : ''} onclick="changeCartItemQty('${product.id}', ${item.qty - 1})" title="Giảm số lượng">
              <i class="fa-solid fa-minus"></i>
            </button>
            <input type="number" class="input-qty" value="${item.qty}" min="1" onchange="changeCartItemQty('${product.id}', parseInt(this.value) || 1)">
            <button type="button" class="btn-qty" onclick="changeCartItemQty('${product.id}', ${item.qty + 1})" title="Tăng số lượng">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </td>
        <td>
          <span class="cart-line-total">${formatCurrency(itemTotal)}</span>
        </td>
        <td class="text-end">
          <button type="button" class="btn-remove-cart-item" onclick="removeCartItem('${product.id}')" title="Xóa món này khỏi giỏ">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  // Tính phí vận chuyển & Giảm giá
  const shippingThreshold = 500000;
  let shippingFee = subtotal >= shippingThreshold ? 0 : 30000;
  let freeshipRemaining = Math.max(0, shippingThreshold - subtotal);
  let freeshipProgress = Math.min(100, Math.round((subtotal / shippingThreshold) * 100));

  let discountAmount = 0;
  if (appliedVoucher) {
    const voucherResult = checkVoucher(appliedVoucher.code, subtotal);
    if (voucherResult.success) {
      discountAmount = voucherResult.discountAmount;
      if (appliedVoucher.discountType === 'shipping') {
        shippingFee = Math.max(0, shippingFee - discountAmount);
      }
    } else {
      appliedVoucher = null;
      localStorage.removeItem('gf_applied_voucher');
    }
  }

  const finalTotal = Math.max(0, subtotal + shippingFee - (appliedVoucher?.discountType === 'shipping' ? 0 : discountAmount));

  // Lấy danh sách vouchers mẫu để gợi ý 1-click
  const allVouchers = getVouchers();
  const voucherSuggestionsHTML = allVouchers.map(v => {
    const isCurrent = appliedVoucher && appliedVoucher.code === v.code;
    const isEligible = subtotal >= v.minOrder;
    return `
      <div class="voucher-preset-card ${isCurrent ? 'border-success bg-success-subtle' : ''}">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="voucher-preset-code">${v.code}</span>
            <small class="fw-bold text-dark">${v.discountType === 'percent' ? `Giảm ${v.discountValue}%` : (v.discountType === 'shipping' ? 'Freeship 30K' : `Giảm ${formatCurrency(v.discountValue)}`)}</small>
          </div>
          <div class="text-muted" style="font-size: 11px; margin-top: 2px;">
            Đơn từ ${formatCurrency(v.minOrder)} • HSD: ${v.expiry}
          </div>
        </div>
        <div>
          ${isCurrent ? `
            <span class="badge bg-success text-white px-2 py-1"><i class="fa-solid fa-check me-1"></i>Đang dùng</span>
          ` : `
            <button type="button" class="btn btn-outline-gf btn-sm py-1 px-2" style="font-size: 12px;" onclick="applyVoucherCode('${v.code}')">
              Áp dụng
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  cartContainer.innerHTML = `
    <!-- Cột danh sách sản phẩm (Bên trái) -->
    <div class="col-lg-8">
      <div class="cart-card">
        <div class="table-responsive">
          <table class="table cart-table">
            <thead>
              <tr>
                <th style="min-width: 260px;">Sản phẩm</th>
                <th style="min-width: 110px;">Đơn giá</th>
                <th style="min-width: 140px;">Số lượng</th>
                <th style="min-width: 120px;">Thành tiền</th>
                <th style="width: 50px;"></th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <a href="products.html" class="btn btn-outline-gf">
          <i class="fa-solid fa-arrow-left me-1"></i> Tiếp tục chọn hoa quả
        </a>
        <button type="button" class="btn btn-light-gf text-danger" onclick="clearEntireCart()">
          <i class="fa-solid fa-trash-can me-1"></i> Xóa tất cả giỏ hàng
        </button>
      </div>
    </div>

    <!-- Cột Tóm Tắt Đơn Hàng & Voucher (Bên phải) -->
    <div class="col-lg-4">
      <div class="cart-summary-card">
        
        <!-- Freeship Progress Goal Box -->
        <div class="freeship-goal-box">
          <div class="d-flex align-items-center justify-content-between small mb-1">
            <span class="fw-bold text-success">
              <i class="fa-solid fa-truck-fast me-1"></i>
              ${freeshipRemaining === 0 ? '🎉 Chúc mừng! Đơn hàng được MIỄN PHÍ SHIP' : `Mua thêm ${formatCurrency(freeshipRemaining)} để Miễn Phí Vận Chuyển`}
            </span>
            <span class="badge bg-white text-success border border-success fw-bold">${freeshipProgress}%</span>
          </div>
          <div class="freeship-goal-progress">
            <div class="freeship-goal-fill" style="width: ${freeshipProgress}%;"></div>
          </div>
        </div>

        <h3 class="h5 fw-bold text-dark mb-3">Tóm Tắt Đơn Hàng</h3>

        <!-- Khung Nhập Voucher -->
        <div class="voucher-form mb-3">
          <div class="input-group">
            <input type="text" class="form-control text-uppercase" id="voucher-input" placeholder="Mã giảm giá (FRESH2026...)" value="${appliedVoucher ? appliedVoucher.code : ''}">
            <button type="button" class="btn btn-primary-gf" id="btn-apply-voucher">Áp dụng</button>
          </div>
        </div>

        ${appliedVoucher ? `
          <div class="alert alert-success py-2 px-3 small d-flex justify-content-between align-items-center mb-3">
            <div>
              <i class="fa-solid fa-tag me-1"></i> Đang áp mã: <strong>${appliedVoucher.code}</strong> (-${formatCurrency(discountAmount)})
            </div>
            <button type="button" class="btn-close small" onclick="removeVoucher()" title="Gỡ mã"></button>
          </div>
        ` : ''}

        <!-- Voucher Preset Suggestions -->
        <div class="mb-4">
          <div class="small fw-bold text-muted mb-2"><i class="fa-solid fa-wand-magic-sparkles text-warning me-1"></i> Mã ưu đãi dành riêng cho bạn:</div>
          <div class="voucher-preset-list">
            ${voucherSuggestionsHTML}
          </div>
        </div>

        <div class="summary-row">
          <span>Tạm tính tiền hàng:</span>
          <strong class="text-dark">${formatCurrency(subtotal)}</strong>
        </div>

        <div class="summary-row">
          <span>Phí giao hàng:</span>
          <span>${shippingFee === 0 ? '<strong class="text-success"><i class="fa-solid fa-check me-1"></i>Miễn phí</strong>' : formatCurrency(shippingFee)}</span>
        </div>

        ${discountAmount > 0 && appliedVoucher?.discountType !== 'shipping' ? `
          <div class="summary-row text-danger">
            <span>Chiết khấu Voucher:</span>
            <strong>-${formatCurrency(discountAmount)}</strong>
          </div>
        ` : ''}

        <div class="summary-row total-row">
          <span>Tổng thanh toán:</span>
          <span class="total-price">${formatCurrency(finalTotal)}</span>
        </div>

        <div class="mt-4">
          <a href="checkout.html" class="btn btn-primary-gf w-100 py-3 font-heading fs-5">
            <i class="fa-solid fa-credit-card me-2"></i> Tiến hành đặt hàng
          </a>
        </div>

        <div class="mt-3 text-center">
          <small class="text-muted d-flex align-items-center justify-content-center gap-2">
            <i class="fa-solid fa-shield-halved text-success"></i> Cam kết 100% sạch, bao ăn 1 đổi 1
          </small>
        </div>

      </div>
    </div>
  `;

  setupVoucherForm();
}

// Thay đổi số lượng item
function changeCartItemQty(productId, qty) {
  const newQty = parseInt(qty);
  if (isNaN(newQty) || newQty < 1) {
    updateCartQty(productId, 1);
  } else {
    updateCartQty(productId, newQty);
  }
  renderCartPage();
}
window.changeCartItemQty = changeCartItemQty;

// Xóa item
function removeCartItem(productId) {
  removeFromCart(productId);
  showToast('Đã xóa món', 'Đã loại bỏ sản phẩm khỏi giỏ hàng.', 'info');
  renderCartPage();
}
window.removeCartItem = removeCartItem;

// Xóa toàn bộ giỏ
function clearEntireCart() {
  if (confirm('Quý khách có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) {
    clearCart();
    localStorage.removeItem('gf_applied_voucher');
    appliedVoucher = null;
    showToast('Đã dọn sạch giỏ hàng', '', 'info');
    renderCartPage();
  }
}
window.clearEntireCart = clearEntireCart;

// Áp dụng mã Voucher từ input
function setupVoucherForm() {
  const btn = document.getElementById('btn-apply-voucher');
  const input = document.getElementById('voucher-input');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    applyVoucherCode(input.value.trim());
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyVoucherCode(input.value.trim());
    }
  });
}

// Áp dụng voucher theo mã
function applyVoucherCode(code) {
  if (!code) {
    showToast('Lỗi mã', 'Vui lòng nhập mã voucher giảm giá.', 'error');
    return;
  }

  const cart = getCart();
  let subtotal = 0;
  cart.forEach(item => {
    const p = getProductById(item.id);
    if (p) subtotal += p.price * item.qty;
  });

  const check = checkVoucher(code, subtotal);
  if (check.success) {
    appliedVoucher = check.voucher;
    localStorage.setItem('gf_applied_voucher', JSON.stringify(appliedVoucher));
    showToast('Áp dụng mã thành công!', check.message, 'success');
    renderCartPage();
  } else {
    showToast('Không thể áp dụng', check.message, 'error');
  }
}
window.applyVoucherCode = applyVoucherCode;

// Gỡ Voucher
function removeVoucher() {
  appliedVoucher = null;
  localStorage.removeItem('gf_applied_voucher');
  showToast('Đã gỡ mã khuyến mãi', '', 'info');
  renderCartPage();
}
window.removeVoucher = removeVoucher;
