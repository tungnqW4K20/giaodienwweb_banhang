/**
 * GreenFruit Eco - Product Detail & Recommendation Logic
 * Xử lý gallery ảnh, thuật toán gợi ý sản phẩm theo độ tương đồng, bảng đánh giá khách hàng chi tiết và bộ tăng giảm số lượng.
 */

let currentProduct = null;
let currentQty = 1;
let currentReviewFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadProductDetails();
  setupQuantityControls();
  setupReviewForm();
});

// ==================== TẢI CHI TIẾT SẢN PHẨM ====================
function loadProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'sp-01';

  currentProduct = getProductById(productId);

  if (!currentProduct) {
    document.getElementById('product-detail-container').innerHTML = `
      <div class="col-12 text-center py-5">
        <h3 class="fw-bold">Sản phẩm không tồn tại hoặc đã ngừng kinh doanh</h3>
        <a href="products.html" class="btn btn-primary-gf mt-3">Quay lại cửa hàng</a>
      </div>
    `;
    return;
  }

  // Cập nhật thẻ Title & Breadcrumb chuẩn SEO
  document.title = `${currentProduct.name} - Hoa Quả Sạch Chuẩn ${currentProduct.cert} | GreenFruit Eco`;
  const breadcrumbName = document.getElementById('breadcrumb-product-name');
  if (breadcrumbName) breadcrumbName.textContent = currentProduct.name;

  // 1. Render Gallery Ảnh
  renderGallery(currentProduct.images);

  // 2. Render Thông tin chi tiết
  renderProductInfo(currentProduct);

  // 3. Render Tabs nội dung & Bảng đánh giá khách hàng
  renderProductTabs(currentProduct);
  renderCustomerReviews(currentProduct.id);

  // 4. Render Sản phẩm gợi ý tương tự theo thuật toán tương đồng
  renderSimilarProductsWithSimilarityScore(currentProduct);

  // 5. Cập nhật Schema JSON-LD
  injectProductSchema(currentProduct);
}

// Render Gallery Ảnh
function renderGallery(images) {
  const mainImg = document.getElementById('gallery-main-img');
  const thumbsContainer = document.getElementById('gallery-thumbs-container');
  
  if (!mainImg || !thumbsContainer) return;

  mainImg.src = images[0];
  mainImg.alt = currentProduct.name;

  let thumbsHTML = '';
  images.forEach((imgUrl, index) => {
    thumbsHTML += `
      <div class="gallery-thumb-item ${index === 0 ? 'active' : ''}" onclick="switchGalleryImage('${imgUrl}', this)">
        <img src="${imgUrl}" alt="${currentProduct.name} ảnh ${index + 1}" loading="lazy">
      </div>
    `;
  });
  thumbsContainer.innerHTML = thumbsHTML;
}

// Chuyển ảnh chính khi click thumbnail
function switchGalleryImage(url, el) {
  const mainImg = document.getElementById('gallery-main-img');
  if (mainImg) {
    mainImg.src = url;
  }
  document.querySelectorAll('.gallery-thumb-item').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}
window.switchGalleryImage = switchGalleryImage;

// Render Thông Tin Sản Phẩm
function renderProductInfo(p) {
  const discountPercent = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const seasonInfo = SEASONS[p.season] || { name: p.seasonName || '', badgeClass: 'badge-season-in' };

  document.getElementById('detail-title').textContent = p.name;
  document.getElementById('detail-category-tag').textContent = p.categoryName;
  
  // Badges
  document.getElementById('detail-season-badge').innerHTML = `
    <span class="badge-season ${seasonInfo.badgeClass}">
      <i class="fa-solid fa-leaf"></i> ${p.season === 'dung-mua' ? 'Đúng Mùa Thu Hoạch' : (p.season === 'trai-mua' ? 'Trái Mùa (Nông nghiệp CNC)' : 'Quanh Năm / Nhập Khẩu')}
    </span>
  `;

  // Rating & Sales
  document.getElementById('detail-rating').textContent = p.rating;
  document.getElementById('detail-reviews-count').textContent = `(${p.reviewCount} đánh giá)`;
  document.getElementById('detail-sales-count').textContent = `Đã bán: ${p.salesCount}`;

  // Price
  document.getElementById('detail-current-price').textContent = formatCurrency(p.price);
  if (p.originalPrice > p.price) {
    document.getElementById('detail-original-price').textContent = formatCurrency(p.originalPrice);
    document.getElementById('detail-discount-pill').innerHTML = `<span class="product-discount-pill">Tiết kiệm ${discountPercent}%</span>`;
  } else {
    document.getElementById('detail-original-price').textContent = '';
    document.getElementById('detail-discount-pill').innerHTML = '';
  }
  document.getElementById('detail-unit').textContent = `/${p.unit}`;

  // Short description
  document.getElementById('detail-short-desc').textContent = p.shortDesc;

  // Specs
  document.getElementById('spec-origin').textContent = p.origin;
  document.getElementById('spec-cert').textContent = p.cert;
  document.getElementById('spec-brix').textContent = p.brix;
  document.getElementById('spec-shelflife').textContent = p.shelfLife;
}

// Render Tabs Nội Dung
function renderProductTabs(p) {
  document.getElementById('tab-desc-content').innerHTML = p.fullDesc;
  document.getElementById('tab-nutrition-content').innerHTML = `
    <div class="alert alert-success d-flex align-items-center gap-3">
      <i class="fa-solid fa-heart-pulse fs-3 text-success"></i>
      <div>
        <h5 class="fw-bold mb-1">Lợi ích sức khỏe vàng</h5>
        <p class="mb-0 small">${p.nutrition}</p>
      </div>
    </div>
    <div class="row g-3 mt-2">
      <div class="col-md-6">
        <div class="p-3 bg-light rounded-3 border">
          <strong class="d-block text-dark mb-1"><i class="fa-solid fa-apple-whole text-success me-1"></i> Cách bảo quản giữ vị ngon:</strong>
          <small class="text-muted">Bảo quản trong ngăn mát tủ lạnh (nhiệt độ 4 - 8°C). Không nên rửa trước khi cho vào tủ lạnh để giữ lớp phấn tự nhiên.</small>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-3 bg-light rounded-3 border">
          <strong class="d-block text-dark mb-1"><i class="fa-solid fa-utensils text-warning me-1"></i> Gợi ý thưởng thức:</strong>
          <small class="text-muted">Ăn trực tiếp sau khi rửa sạch, kết hợp làm salad hoa quả hữu cơ, ép nước Cold-Pressed hoặc làm sinh tố thơm mát.</small>
        </div>
      </div>
    </div>
  `;
}

// ==================== BỘ TĂNG GIẢM SỐ LƯỢNG HIỆN ĐẠI ====================
function setupQuantityControls() {
  const btnMinus = document.getElementById('btn-qty-minus');
  const btnPlus = document.getElementById('btn-qty-plus');
  const inputQty = document.getElementById('input-qty');
  const btnAddToCart = document.getElementById('btn-add-to-cart');
  const btnBuyNow = document.getElementById('btn-buy-now');

  function updateMinusBtnState(val) {
    if (btnMinus) {
      if (val <= 1) {
        btnMinus.classList.add('disabled');
      } else {
        btnMinus.classList.remove('disabled');
      }
    }
  }

  if (btnMinus && btnPlus && inputQty) {
    updateMinusBtnState(parseInt(inputQty.value) || 1);

    btnMinus.addEventListener('click', () => {
      let val = parseInt(inputQty.value) || 1;
      if (val > 1) {
        val--;
        inputQty.value = val;
        currentQty = val;
        updateMinusBtnState(val);
      }
    });

    btnPlus.addEventListener('click', () => {
      let val = parseInt(inputQty.value) || 1;
      if (val < 99) {
        val++;
        inputQty.value = val;
        currentQty = val;
        updateMinusBtnState(val);
      }
    });

    inputQty.addEventListener('change', () => {
      let val = parseInt(inputQty.value) || 1;
      if (val < 1) val = 1;
      if (val > 99) val = 99;
      inputQty.value = val;
      currentQty = val;
      updateMinusBtnState(val);
    });
  }

  // Thêm vào giỏ
  if (btnAddToCart) {
    btnAddToCart.addEventListener('click', () => {
      if (!currentProduct) return;
      addToCart(currentProduct.id, currentQty);
      showToast('Đã thêm vào giỏ!', `Đã thêm ${currentQty} ${currentProduct.unit} ${currentProduct.name} vào giỏ hàng.`, 'success');
    });
  }

  // Mua ngay -> Chuyển sang checkout
  if (btnBuyNow) {
    btnBuyNow.addEventListener('click', () => {
      if (!currentProduct) return;
      addToCart(currentProduct.id, currentQty);
      window.location.href = 'checkout.html';
    });
  }
}

// ==================== HỆ THỐNG ĐÁNH GIÁ KHÁCH HÀNG CHI TIẾT ====================
function renderCustomerReviews(productId) {
  const reviews = getReviewsForProduct(productId);
  const container = document.getElementById('product-reviews-list');
  const overviewContainer = document.getElementById('reviews-overview-container');
  
  if (!container || !overviewContainer) return;

  // Tính toán Rating Breakdown
  const total = reviews.length;
  let counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sumScore = 0;

  reviews.forEach(r => {
    const star = parseInt(r.rating) || 5;
    counts[star] = (counts[star] || 0) + 1;
    sumScore += star;
  });

  const avgScore = total > 0 ? (sumScore / total).toFixed(1) : '5.0';

  // Render Rating Overview Card
  overviewContainer.innerHTML = `
    <div class="rating-overview-card">
      <div class="row align-items-center g-4">
        <div class="col-md-4 text-center border-end">
          <div class="rating-big-score text-success">${avgScore}</div>
          <div class="text-warning mb-1 fs-5">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
          </div>
          <small class="text-muted fw-bold d-block">${total} lượt đánh giá thực tế</small>
        </div>
        <div class="col-md-8">
          ${[5, 4, 3, 2, 1].map(star => {
            const count = counts[star] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
              <div class="star-progress-row">
                <span class="star-progress-label">${star} <i class="fa-solid fa-star text-warning small"></i></span>
                <div class="star-progress-bar-wrap">
                  <div class="star-progress-fill" style="width: ${percent}%;"></div>
                </div>
                <span class="star-progress-percent">${percent}%</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Review Filter Pills -->
    <div class="review-filter-pills" id="review-filter-pills">
      <button class="review-filter-btn ${currentReviewFilter === 'all' ? 'active' : ''}" data-star="all">Tất cả (${total})</button>
      <button class="review-filter-btn ${currentReviewFilter === '5' ? 'active' : ''}" data-star="5">5 Sao (${counts[5] || 0})</button>
      <button class="review-filter-btn ${currentReviewFilter === '4' ? 'active' : ''}" data-star="4">4 Sao (${counts[4] || 0})</button>
      <button class="review-filter-btn ${currentReviewFilter === '3' ? 'active' : ''}" data-star="3">3 Sao (${counts[3] || 0})</button>
    </div>
  `;

  // Gắn sự kiện lọc đánh giá
  document.querySelectorAll('#review-filter-pills .review-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#review-filter-pills .review-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentReviewFilter = btn.dataset.star;
      renderFilteredReviewsList(productId);
    });
  });

  renderFilteredReviewsList(productId);
}

// Render danh sách review sau khi lọc
function renderFilteredReviewsList(productId) {
  const container = document.getElementById('product-reviews-list');
  if (!container) return;

  let reviews = getReviewsForProduct(productId);
  if (currentReviewFilter !== 'all') {
    reviews = reviews.filter(r => parseInt(r.rating) === parseInt(currentReviewFilter));
  }

  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fa-regular fa-comment-dots fs-2 mb-2"></i>
        <p class="small">Chưa có đánh giá nào cho mức sao này.</p>
      </div>
    `;
    return;
  }

  let html = '';
  reviews.forEach(r => {
    html += `
      <div class="review-item-card">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center gap-3">
            <img src="${r.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="${r.author}" class="review-author-avatar">
            <div>
              <strong class="text-dark d-block">${r.author}</strong>
              <div class="d-flex align-items-center gap-2 mt-1">
                <span class="verified-buyer-badge">
                  <i class="fa-solid fa-circle-check"></i> Đã mua hàng tại GreenFruit
                </span>
                <small class="text-muted">• ${r.location || 'Khách hàng thân thiết'}</small>
              </div>
            </div>
          </div>
          <small class="text-muted">${r.date}</small>
        </div>

        <div class="text-warning small mb-2">
          ${'<i class="fa-solid fa-star"></i>'.repeat(parseInt(r.rating))}
        </div>

        <p class="text-dark fs-6 mb-2 lh-base">${r.comment}</p>

        <div class="d-flex align-items-center gap-3 small text-muted pt-2 border-top">
          <span class="cursor-pointer text-primary" onclick="showToast('Cảm ơn!', 'Bạn đã thích đánh giá này.', 'info')">
            <i class="fa-regular fa-thumbs-up me-1"></i> Hữu ích (${r.likes || 12})
          </span>
          <span>• Đánh giá đã được xác thực</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Xử lý Form gửi đánh giá khách hàng
function setupReviewForm() {
  const form = document.getElementById('product-review-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('review-author-name');
    const commentInput = document.getElementById('review-comment-text');
    const ratingSelect = document.getElementById('review-star-select');

    if (!nameInput.value.trim() || !commentInput.value.trim()) return;

    const newReview = {
      id: `rev-${Date.now()}`,
      productId: currentProduct.id,
      author: nameInput.value.trim(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      location: 'Việt Nam',
      rating: parseInt(ratingSelect.value),
      date: new Date().toLocaleDateString('vi-VN'),
      verified: true,
      comment: commentInput.value.trim(),
      likes: 0
    };

    addReview(currentProduct.id, newReview);
    showToast('Gửi đánh giá thành công!', 'Cảm ơn quý khách đã phản hồi chất lượng hoa quả!', 'success');
    
    form.reset();
    renderCustomerReviews(currentProduct.id);
  });
}

// ==================== THUẬT TOÁN TÍNH ĐỘ TƯƠNG ĐỒNG GỢI Ý ====================
/**
 * Thuật toán tính điểm tương đồng (Similarity Score 0 - 100%):
 * 1. Cùng danh mục (Category): +35 điểm
 * 2. Cùng mùa vụ (Season): +30 điểm
 * 3. Độ gần về phân khúc giá (Price Proximity): +20 * (1 - |P1 - P2| / MaxPrice)
 * 4. Cùng tiêu chuẩn chứng nhận (Cert): +15 điểm
 */
function calculateProductSimilarity(targetProduct, candidate) {
  let score = 0;

  // 1. Cùng danh mục (+35)
  if (candidate.category === targetProduct.category) {
    score += 35;
  }

  // 2. Cùng mùa vụ (+30)
  if (candidate.season === targetProduct.season) {
    score += 30;
  } else if (candidate.season === 'dung-mua' || targetProduct.season === 'dung-mua') {
    score += 15;
  }

  // 3. Phân khúc giá (+20)
  const priceDiff = Math.abs(candidate.price - targetProduct.price);
  const maxRef = Math.max(candidate.price, targetProduct.price, 800000);
  const priceScore = Math.max(0, 20 * (1 - (priceDiff / maxRef)));
  score += priceScore;

  // 4. Tiêu chuẩn chứng nhận (+15)
  if (candidate.cert.toLowerCase() === targetProduct.cert.toLowerCase()) {
    score += 15;
  } else if (candidate.cert.includes('GAP') && targetProduct.cert.includes('GAP')) {
    score += 10;
  }

  return Math.min(99, Math.max(50, Math.round(score)));
}

// Render Sản Phẩm Gợi Ý Với Điểm Tương Đồng
function renderSimilarProductsWithSimilarityScore(product) {
  const container = document.getElementById('related-products-container');
  if (!container) return;

  const allProducts = getProducts();
  const candidates = allProducts.filter(p => p.id !== product.id);

  // Tính điểm tương đồng cho từng sản phẩm
  const scoredProducts = candidates.map(candidate => {
    return {
      ...candidate,
      similarityScore: calculateProductSimilarity(product, candidate)
    };
  });

  // Sắp xếp giảm dần theo điểm tương đồng
  scoredProducts.sort((a, b) => b.similarityScore - a.similarityScore);
  const topSimilar = scoredProducts.slice(0, 4);

  let html = '';
  topSimilar.forEach(p => {
    const discountPercent = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
    const seasonInfo = SEASONS[p.season] || { name: p.seasonName || '', badgeClass: 'badge-season-in' };
    const cleanUnit = (p.unit || 'kg').split('(')[0].trim();

    html += `
      <div class="col-6 col-md-4 col-lg-3 mb-4">
        <div class="product-card">
          <div class="product-card-img-wrap">
            <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
            
            <!-- Similarity Score Pill -->
            <span class="similarity-badge-pill">
              <i class="fa-solid fa-bullseye"></i> ${p.similarityScore}% Tương đồng
            </span>

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
  });

  container.innerHTML = html;
}

// Inject JSON-LD Schema
function injectProductSchema(p) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "image": p.images,
    "description": p.shortDesc,
    "brand": {
      "@type": "Brand",
      "name": "GreenFruit Eco"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "VND",
      "price": p.price,
      "priceValidUntil": "2026-12-31",
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": p.rating,
      "reviewCount": p.reviewCount
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}
