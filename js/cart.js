/**
 * GreenFruit Eco - Shopping Cart Logic
 * Quản lý hiển thị giỏ hàng, tích chọn sản phẩm thanh toán (Checkbox / Select All),
 * tăng giảm số lượng, áp mã voucher giảm giá và tính toán phí vận chuyển.
 */

let appliedVoucher = null;
let selectedItemIds = new Set();
let isInitialSelectionDone = false;

document.addEventListener('DOMContentLoaded', async () => {
  loadAppliedVoucher();
  loadSavedSelectionState();
  if (window.EcoFruitAPI && window.EcoFruitAPI.getToken()) {
    await updateCartBadge();
  }
  renderCartPage();
});

// Lắng nghe sự kiện đồng bộ dữ liệu từ Django API & cập nhật giỏ hàng
window.addEventListener('ecofruit:data-synced', () => {
  console.log('[Cart] Cập nhật giỏ hàng từ API Backend');
  renderCartPage();
});

window.addEventListener('ecofruit:cart-updated', () => {
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

// Nạp trạng thái tích chọn sản phẩm
function loadSavedSelectionState() {
  try {
    const saved = localStorage.getItem('gf_selected_cart_ids');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length > 0) {
        selectedItemIds = new Set(arr.map(id => String(id).toLowerCase()));
        isInitialSelectionDone = true;
      }
    }
  } catch (e) {
    selectedItemIds = new Set();
  }
}

function saveSelectionState() {
  try {
    localStorage.setItem('gf_selected_cart_ids', JSON.stringify(Array.from(selectedItemIds)));
  } catch (e) {
    // Ignore storage issues
  }
}

// ==================== RENDER TRANG GIỎ HÀNG ====================
function renderCartPage() {
  const cart = getCart();
  const cartContainer = document.getElementById('cart-page-content');
  
  if (!cartContainer) return;

  if (cart.length === 0) {
    selectedItemIds.clear();
    saveSelectionState();
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

  // Khởi tạo mặc định: tích chọn tất cả sản phẩm nếu chưa từng bỏ chọn
  const currentCartIdSet = new Set(cart.map(item => String(item.id || item.product_id).toLowerCase()));
  if (!isInitialSelectionDone || selectedItemIds.size === 0) {
    currentCartIdSet.forEach(id => selectedItemIds.add(id));
    isInitialSelectionDone = true;
    saveSelectionState();
  } else {
    // Xóa các ID không còn tồn tại trong giỏ
    selectedItemIds.forEach(id => {
      if (!currentCartIdSet.has(id)) {
        selectedItemIds.delete(id);
      }
    });
    // Nếu vẫn còn sản phẩm mới thêm vào giỏ chưa có trong set, mặc định tích chọn luôn
    currentCartIdSet.forEach(id => {
      if (!selectedItemIds.has(id) && selectedItemIds.size === cart.length - 1) {
        selectedItemIds.add(id);
      }
    });
    saveSelectionState();
  }

  let tableRowsHTML = '';
  let subtotal = 0;
  let selectedCount = 0;
  let totalItemCount = cart.length;

  cart.forEach(item => {
    const targetId = String(item.id || item.product_id);
    const targetIdLower = targetId.toLowerCase();
    const isSelected = selectedItemIds.has(targetIdLower);

    if (isSelected) {
      selectedCount++;
    }

    const product = (typeof getProductById === 'function' ? getProductById(targetId) : null) || {
      id: targetId,
      name: item.name || 'Hoa quả sạch EcoFruit',
      price: Number(item.price || 0),
      images: [item.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600'],
      cert: 'VietGAP',
      origin: 'Việt Nam',
      unit: item.unit || 'kg'
    };

    const itemPrice = Number(product.price || item.price || 0);
    const itemTotal = itemPrice * item.qty;

    if (isSelected) {
      subtotal += itemTotal;
    }

    const thumbImg = (product.images && product.images[0]) || product.image || item.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600';
    const detailUrl = `product-detail.html?id=${encodeURIComponent(product.id)}`;

    tableRowsHTML += `
      <tr class="${isSelected ? 'selected-row' : 'unselected-row'}">
        <td style="width: 45px; text-align: center;">
          <input type="checkbox" class="form-check-input cart-row-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleCartItemSelection('${targetId}', this.checked)" title="Chọn sản phẩm này để thanh toán">
        </td>
        <td>
          <div class="d-flex align-items-center gap-3">
            <a href="${detailUrl}" class="cart-product-thumb-link" title="Bấm xem chi tiết ${product.name}">
              <img src="${thumbImg}" alt="${product.name}" class="cart-product-thumb" loading="lazy">
            </a>
            <div>
              <div class="cart-product-title">
                <a href="${detailUrl}" title="Bấm xem chi tiết ${product.name}">${product.name}</a>
              </div>
              <div class="d-flex align-items-center gap-2 flex-wrap mt-1">
                <span class="badge bg-success-subtle text-success border border-success-subtle small px-2 py-1">
                  <i class="fa-solid fa-shield-halved me-1"></i>${product.cert || 'VietGAP'}
                </span>
                <span class="small text-muted">Xuất xứ: ${product.origin || 'Việt Nam'}</span>
              </div>
              <div class="small text-danger fw-bold d-md-none mt-2">
                ${formatCurrency(itemPrice)} / ${item.unit || product.unit || 'kg'}
              </div>
            </div>
          </div>
        </td>
        <td>
          <div class="cart-unit-price">${formatCurrency(itemPrice)}</div>
          <small class="text-muted">/${item.unit || product.unit || 'kg'}</small>
        </td>
        <td>
          <div class="quantity-control">
            <button type="button" class="btn-qty" ${item.qty <= 1 ? 'disabled' : ''} onclick="changeCartItemQty('${targetId}', ${item.qty - 1})" title="Giảm số lượng">
              <i class="fa-solid fa-minus"></i>
            </button>
            <input type="number" class="input-qty" value="${item.qty}" min="1" onchange="changeCartItemQty('${targetId}', parseInt(this.value) || 1)">
            <button type="button" class="btn-qty" onclick="changeCartItemQty('${targetId}', ${item.qty + 1})" title="Tăng số lượng">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </td>
        <td>
          <span class="cart-line-total">${formatCurrency(itemTotal)}</span>
        </td>
        <td class="text-end">
          <button type="button" class="btn-remove-cart-item" onclick="removeCartItem('${targetId}')" title="Xóa món này khỏi giỏ">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  const isAllSelected = totalItemCount > 0 && selectedCount === totalItemCount;

  // Tính phí vận chuyển & Giảm giá dựa trên các sản phẩm ĐÃ CHỌN
  const shippingThreshold = 500000;
  let shippingFee = 0;
  let freeshipRemaining = 0;
  let freeshipProgress = 0;

  if (selectedCount > 0) {
    shippingFee = subtotal >= shippingThreshold ? 0 : 30000;
    freeshipRemaining = Math.max(0, shippingThreshold - subtotal);
    freeshipProgress = Math.min(100, Math.round((subtotal / shippingThreshold) * 100));
  }

  let discountAmount = 0;
  if (appliedVoucher && selectedCount > 0) {
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

  const finalTotal = selectedCount > 0 
    ? Math.max(0, subtotal + shippingFee - (appliedVoucher?.discountType === 'shipping' ? 0 : discountAmount))
    : 0;

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
        
        <!-- Thanh công cụ chọn nhanh -->
        <div class="cart-selection-bar">
          <div class="d-flex align-items-center gap-2">
            <input type="checkbox" class="form-check-input cart-header-checkbox" id="cart-select-all" ${isAllSelected ? 'checked' : ''} onchange="toggleSelectAllCartItems(this.checked)">
            <label class="form-check-label fw-bold small cursor-pointer" for="cart-select-all">
              Chọn tất cả (${totalItemCount} sản phẩm)
            </label>
            <span class="badge bg-success font-heading ms-2">Đã chọn: ${selectedCount}/${totalItemCount} món</span>
          </div>
          ${selectedCount > 0 ? `
            <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2" onclick="removeSelectedCartItems()" title="Xóa các sản phẩm đã chọn">
              <i class="fa-solid fa-trash-can me-1"></i> Xóa ${selectedCount} món đã chọn
            </button>
          ` : `
            <small class="text-muted fst-italic">Vui lòng chọn sản phẩm để thanh toán</small>
          `}
        </div>

        <div class="table-responsive">
          <table class="table cart-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">
                  <input type="checkbox" class="form-check-input cart-header-checkbox" ${isAllSelected ? 'checked' : ''} onchange="toggleSelectAllCartItems(this.checked)" title="Chọn tất cả">
                </th>
                <th style="min-width: 250px;">Sản phẩm (Bấm ảnh để xem chi tiết)</th>
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
          <i class="fa-solid fa-trash-can me-1"></i> Xóa toàn bộ giỏ hàng
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
              ${selectedCount === 0 ? 'Vui lòng tích chọn sản phẩm để tính phí ship' : (freeshipRemaining === 0 ? '🎉 Chúc mừng! Đơn hàng được MIỄN PHÍ SHIP' : `Mua thêm ${formatCurrency(freeshipRemaining)} để Miễn Phí Ship`)}
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
          <span>Tạm tính (${selectedCount} món):</span>
          <strong class="text-dark">${formatCurrency(subtotal)}</strong>
        </div>

        <div class="summary-row">
          <span>Phí giao hàng:</span>
          <span>${selectedCount === 0 ? '0 đ' : (shippingFee === 0 ? '<strong class="text-success"><i class="fa-solid fa-check me-1"></i>Miễn phí</strong>' : formatCurrency(shippingFee))}</span>
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
          <button type="button" class="btn btn-primary-gf w-100 py-3 font-heading fs-5 ${selectedCount === 0 ? 'opacity-75' : ''}" onclick="proceedToCheckout()">
            <i class="fa-solid fa-credit-card me-2"></i> Tiến hành đặt hàng (${selectedCount} món)
          </button>
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

// ==================== XỬ LÝ TÍCH CHỌN SẢN PHẨM ====================
function toggleCartItemSelection(productId, isChecked) {
  const targetIdLower = String(productId).toLowerCase();
  if (isChecked) {
    selectedItemIds.add(targetIdLower);
  } else {
    selectedItemIds.delete(targetIdLower);
  }
  saveSelectionState();
  renderCartPage();
}
window.toggleCartItemSelection = toggleCartItemSelection;

function toggleSelectAllCartItems(isChecked) {
  const cart = getCart();
  if (isChecked) {
    cart.forEach(item => selectedItemIds.add(String(item.id || item.product_id).toLowerCase()));
  } else {
    selectedItemIds.clear();
  }
  saveSelectionState();
  renderCartPage();
}
window.toggleSelectAllCartItems = toggleSelectAllCartItems;

function removeSelectedCartItems() {
  const cart = getCart();
  const selectedCart = cart.filter(item => selectedItemIds.has(String(item.id || item.product_id).toLowerCase()));
  
  if (selectedCart.length === 0) return;

  if (confirm(`Quý khách có chắc chắn muốn xóa ${selectedCart.length} sản phẩm đã chọn khỏi giỏ hàng?`)) {
    selectedCart.forEach(item => {
      removeFromCart(item.id || item.product_id);
      selectedItemIds.delete(String(item.id || item.product_id).toLowerCase());
    });
    saveSelectionState();
    showToast('Đã xóa', `Đã loại bỏ ${selectedCart.length} sản phẩm khỏi giỏ hàng.`, 'info');
    renderCartPage();
  }
}
window.removeSelectedCartItems = removeSelectedCartItems;

// Tiến hành đặt hàng với các sản phẩm đã tích chọn
function proceedToCheckout() {
  const cart = getCart();
  const selectedCart = cart.filter(item => selectedItemIds.has(String(item.id || item.product_id).toLowerCase()));

  if (selectedCart.length === 0) {
    showToast('Chưa chọn sản phẩm', 'Vui lòng tích chọn ít nhất 1 sản phẩm trong giỏ hàng để tiến hành thanh toán.', 'warning');
    return;
  }

  // Lưu danh sách sản phẩm được chọn để thanh toán sang trang checkout
  try {
    localStorage.setItem('gf_selected_checkout_items', JSON.stringify(selectedCart));
  } catch (e) {
    console.error('Không thể lưu selected items:', e);
  }

  window.location.href = 'checkout.html';
}
window.proceedToCheckout = proceedToCheckout;

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
  selectedItemIds.delete(String(productId).toLowerCase());
  saveSelectionState();
  showToast('Đã xóa món', 'Đã loại bỏ sản phẩm khỏi giỏ hàng.', 'info');
  renderCartPage();
}
window.removeCartItem = removeCartItem;

// Xóa toàn bộ giỏ
function clearEntireCart() {
  if (confirm('Quý khách có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) {
    clearCart();
    selectedItemIds.clear();
    saveSelectionState();
    localStorage.removeItem('gf_applied_voucher');
    localStorage.removeItem('gf_selected_checkout_items');
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
async function applyVoucherCode(code) {
  if (!code) {
    showToast('Lỗi mã', 'Vui lòng nhập mã voucher giảm giá.', 'error');
    return;
  }

  const cart = getCart();
  const selectedCart = cart.filter(item => selectedItemIds.has(String(item.id || item.product_id).toLowerCase()));
  
  if (selectedCart.length === 0) {
    showToast('Chưa chọn sản phẩm', 'Vui lòng tích chọn sản phẩm trước khi áp dụng mã voucher.', 'warning');
    return;
  }

  let subtotal = 0;
  selectedCart.forEach(item => {
    const p = getProductById(item.id || item.product_id);
    const price = p ? p.price : (item.price || 0);
    subtotal += price * item.qty;
  });

  // 1. Thử gọi API backend kiểm tra voucher trên MySQL
  if (window.EcoFruitAPI) {
    try {
      const res = await EcoFruitAPI.validateVoucher(code, subtotal);
      if (res && res.data && res.data.valid) {
        appliedVoucher = {
          code: res.data.voucher.code,
          title: res.data.voucher.title,
          discountType: res.data.voucher.discount_type === 'PERCENT' ? 'percent' : 'fixed',
          discountValue: Number(res.data.discount_amount),
          maxDiscount: Number(res.data.voucher.max_discount_amount || 100000),
          minOrder: Number(res.data.voucher.min_order_amount || 0)
        };
        localStorage.setItem('gf_applied_voucher', JSON.stringify(appliedVoucher));
        showToast('Áp dụng mã thành công!', `Giảm ${formatCurrency(res.data.discount_amount)} (MySQL Verified)`, 'success');
        renderCartPage();
        return;
      }
    } catch (err) {
      console.log('[Voucher API] Backend validation fallback:', err.message);
    }
  }

  // 2. Local Fallback
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
