/**
 * GreenFruit Eco - Homepage Logic
 * Xử lý đếm ngược Flash Sale, nạp sản phẩm nổi bật, phân loại mùa vụ và đăng ký nhận bản tin.
 */

document.addEventListener('DOMContentLoaded', () => {
  initFlashSaleCountdown();
  renderFlashSaleProducts();
  renderSeasonalProducts('dung-mua');
  renderFeaturedProducts();
  setupSeasonalTabs();
  setupNewsletterForm();
});

// ==================== ĐẾM NGƯỢC FLASH SALE ====================
function initFlashSaleCountdown() {
  const hoursEl = document.getElementById('fs-hours');
  const minutesEl = document.getElementById('fs-minutes');
  const secondsEl = document.getElementById('fs-seconds');
  if (!hoursEl || !minutesEl || !secondsEl) return;

  // Thiết lập thời gian kết thúc (Cuối ngày hôm nay)
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  function updateTimer() {
    const currentTime = new Date();
    let diff = Math.floor((endOfDay - currentTime) / 1000);

    if (diff <= 0) {
      diff = 24 * 3600; // Reset sang ngày mới
    }

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    hoursEl.textContent = hours.toString().padStart(2, '0');
    minutesEl.textContent = minutes.toString().padStart(2, '0');
    secondsEl.textContent = seconds.toString().padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// ==================== RENDER SẢN PHẨM FLASH SALE ====================
function renderFlashSaleProducts() {
  const container = document.getElementById('flash-sale-products-container');
  if (!container) return;

  const products = getProducts();
  const flashSaleItems = products.filter(p => p.isFlashSale).slice(0, 4);

  let html = '';
  flashSaleItems.forEach(p => {
    const discountPercent = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
    const soldRatio = Math.min(100, Math.round((p.salesCount / (p.salesCount + p.stock)) * 100));
    const cleanUnit = (p.unit || 'kg').split('(')[0].trim();

    html += `
      <div class="col-6 col-md-3 mb-3">
        <div class="product-card">
          <div class="product-card-img-wrap">
            <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
            <div class="product-badges-top">
              <span class="badge bg-danger text-white fw-bold"><i class="fa-solid fa-bolt"></i> HOT DEAL</span>
              <span class="product-discount-pill">-${discountPercent}%</span>
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
            <div class="product-price-box">
              <div class="d-flex align-items-baseline gap-1 flex-wrap">
                <span class="current-price text-danger">${formatCurrency(p.price)}</span>
                <span class="original-price">${formatCurrency(p.originalPrice)}</span>
              </div>
              <div class="unit-text">/${cleanUnit}</div>
            </div>
            <!-- Stock progress -->
            <div class="flash-sale-stock-box">
              <div class="stock-info-row">
                <span>Đã bán: <strong>${p.salesCount}</strong></span>
                <span>Còn: <strong>${p.stock}</strong></span>
              </div>
              <div class="stock-progress">
                <div class="stock-progress-bar" style="width: ${soldRatio}%;"></div>
              </div>
            </div>
            <div class="mt-auto pt-2">
              <button class="btn btn-primary-gf w-100 py-2 btn-sm" onclick="handleQuickAddToCart('${p.id}', event)">
                <i class="fa-solid fa-cart-plus me-1"></i> Mua ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==================== RENDER SẢN PHẨM THEO MÙA VỤ ====================
function renderSeasonalProducts(seasonKey) {
  const container = document.getElementById('seasonal-products-container');
  if (!container) return;

  const products = getProducts();
  const filtered = products.filter(p => p.season === seasonKey).slice(0, 8);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fa-solid fa-leaf text-muted fs-1 mb-2"></i>
        <p class="text-muted">Đang cập nhật các loại hoa quả cho mùa vụ này.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(p => {
    html += renderProductCardHTML(p);
  });

  container.innerHTML = html;
}

// Gắn sự kiện chuyển tab mùa vụ
function setupSeasonalTabs() {
  const tabs = document.querySelectorAll('.seasonal-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const season = tab.dataset.season;
      renderSeasonalProducts(season);
    });
  });
}

// ==================== RENDER SẢN PHẨM NỔI BẬT & BÁN CHẠY ====================
function renderFeaturedProducts() {
  const container = document.getElementById('featured-products-container');
  if (!container) return;

  const products = getProducts();
  const featured = products.filter(p => p.isFeatured).slice(0, 8);

  let html = '';
  featured.forEach(p => {
    html += renderProductCardHTML(p);
  });

  container.innerHTML = html;
}

// ==================== FORM ĐĂNG KÝ BẢN TIN ====================
function setupNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput && emailInput.value.trim()) {
      showToast('Đăng ký thành công!', 'GreenFruit Eco đã gửi tặng voucher giảm 10% vào email của bạn!', 'success');
      emailInput.value = '';
    }
  });
}
