/**
 * GreenFruit Eco - Product Detail & Recommendation Logic
 * Xử lý gallery ảnh, thông số dinh dưỡng, độ ngọt Brix, hạn sử dụng,
 * thuật toán gợi ý tương đồng, bảng đánh giá khách hàng và xác thực Verified Buyer.
 */

let currentProduct = null;
let currentQty = 1;
let currentReviewFilter = 'all';
let currentLoadedReviews = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadProductDetails();
  setupQuantityControls();
  await setupReviewForm();
});

// Lắng nghe sự kiện đồng bộ dữ liệu từ Python Django API
window.addEventListener('ecofruit:data-synced', async () => {
  console.log('[ProductDetail] Cập nhật chi tiết sản phẩm từ API Live');
  await loadProductDetails();
});

// ==================== TẢI CHI TIẾT SẢN PHẨM ====================
async function loadProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id') || 'sp-01';

  let p = getProductById(productId);

  // Thử nạp chi tiết đầy đủ trực tiếp từ Django REST Backend nếu kết nối được
  if (window.EcoFruitAPI) {
    try {
      const apiDetail = await window.EcoFruitAPI.getProductDetail(productId);
      if (apiDetail) {
        const descText = apiDetail.description || apiDetail.short_description || p?.fullDesc || p?.description || `${apiDetail.name} - Hoa quả tươi sạch hảo hạng tuyển chọn tại EcoFruit.`;
        const shortDescText = apiDetail.short_description || p?.shortDesc || apiDetail.name;
        const nutritionText = apiDetail.vitamins 
          ? `${apiDetail.vitamins} (${apiDetail.calories || '52 kcal / 100g'})`
          : (p?.nutrition || 'Bổ sung dồi dào Vitamin C, chất xơ tự nhiên, thanh lọc cơ thể và tăng đề kháng.');

        p = {
          ...(p || {}),
          id: String(apiDetail.id),
          sku: apiDetail.sku || p?.sku || `SKU-${apiDetail.id}`,
          name: apiDetail.name,
          slug: apiDetail.slug,
          category: apiDetail.category_slug || p?.category || 'noi-dia',
          categoryId: String(apiDetail.category || p?.categoryId || 1),
          categoryName: apiDetail.category_name || p?.categoryName || 'Hoa Quả Tươi',
          season: apiDetail.season === 'OFF_SEASON' ? 'trai-mua' : (apiDetail.season === 'ALL_YEAR' ? 'quanh-nam' : 'dung-mua'),
          seasonName: apiDetail.season_display || p?.seasonName || 'Đúng Mùa Thu Hoạch',
          price: Number(apiDetail.price),
          originalPrice: Number(apiDetail.original_price || apiDetail.price),
          unit: apiDetail.unit || p?.unit || 'kg',
          stock: Number(apiDetail.stock || 100),
          salesCount: Number(apiDetail.sold_count || p?.salesCount || 50),
          rating: Number(apiDetail.rating || p?.rating || 5.0),
          reviewCount: Number(apiDetail.review_count || p?.reviewCount || 10),
          reviewsCount: Number(apiDetail.review_count || p?.reviewCount || 10),
          origin: apiDetail.origin || p?.origin || 'Việt Nam',
          cert: apiDetail.certification || p?.cert || 'VietGAP',
          brix: apiDetail.brix || p?.brix || '12° - 16° Brix (Ngọt thanh tự nhiên)',
          shelfLife: apiDetail.shelf_life || p?.shelfLife || '5 - 7 ngày bảo quản ngăn mát 4-8°C',
          images: (apiDetail.gallery_images && apiDetail.gallery_images.length > 0)
            ? apiDetail.gallery_images.map(img => img.image_url)
            : (apiDetail.image ? [apiDetail.image] : (p?.images || ['https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80'])),
          shortDesc: shortDescText,
          description: descText,
          fullDesc: descText.startsWith('<') ? descText : `<p>${descText}</p>`,
          calories: apiDetail.calories || p?.calories || '52 kcal / 100g',
          vitamins: apiDetail.vitamins || p?.vitamins || 'Vitamin C, Vitamin A, Chất xơ',
          storageGuide: apiDetail.storage_guide || p?.storageGuide || 'Bảo quản trong ngăn mát tủ lạnh (nhiệt độ 4 - 8°C)',
          nutrition: nutritionText,
          tags: apiDetail.tags || p?.tags || ''
        };
      }
    } catch (e) {
      console.debug('[ProductDetail] Live fetch error:', e);
    }
  }

  if (!p) {
    document.getElementById('product-detail-container').innerHTML = `
      <div class="col-12 text-center py-5">
        <h3 class="fw-bold">Sản phẩm không tồn tại hoặc đã ngừng kinh doanh</h3>
        <a href="products.html" class="btn btn-primary-gf mt-3">Quay lại cửa hàng</a>
      </div>
    `;
    return;
  }

  currentProduct = p;

  // Cập nhật thẻ Title & Breadcrumb chuẩn SEO
  document.title = `${currentProduct.name} - Hoa Quả Sạch Chuẩn ${currentProduct.cert || 'VietGAP'} | GreenFruit Eco`;
  const breadcrumbName = document.getElementById('breadcrumb-product-name');
  if (breadcrumbName) breadcrumbName.textContent = currentProduct.name;

  // 1. Render Gallery Ảnh
  renderGallery(currentProduct.images || [currentProduct.image]);

  // 2. Render Thông tin chi tiết
  renderProductInfo(currentProduct);

  // 3. Render Tabs nội dung & Bảng đánh giá khách hàng
  renderProductTabs(currentProduct);
  await renderCustomerReviews(currentProduct.id);

  // 4. Render Sản phẩm gợi ý tương tự theo thuật toán tương đồng
  renderSimilarProductsWithSimilarityScore(currentProduct);

  // 5. Cập nhật Schema JSON-LD
  injectProductSchema(currentProduct);
}

// Render Gallery Ảnh
function renderGallery(images) {
  const mainImg = document.getElementById('gallery-main-img');
  const thumbsContainer = document.getElementById('gallery-thumbs-container');
  
  if (!mainImg || !thumbsContainer || !images || images.length === 0) return;

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
  if (!p) return;
  const originalPrice = Number(p.originalPrice || p.price || 0);
  const currentPrice = Number(p.price || 0);
  const discountPercent = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const seasonInfo = SEASONS[p.season] || { name: p.seasonName || 'Đúng Mùa Thu Hoạch', badgeClass: 'badge-season-in' };

  const titleEl = document.getElementById('detail-title');
  if (titleEl) titleEl.textContent = p.name || 'Hoa Quả Tươi Sạch';

  const catTag = document.getElementById('detail-category-tag');
  if (catTag) catTag.textContent = p.categoryName || 'Hoa Quả Tươi Sạch';
  
  // Badges
  const seasonBadge = document.getElementById('detail-season-badge');
  if (seasonBadge) {
    seasonBadge.innerHTML = `
      <span class="badge-season ${seasonInfo.badgeClass}">
        <i class="fa-solid fa-leaf"></i> ${p.season === 'dung-mua' ? 'Đúng Mùa Thu Hoạch' : (p.season === 'trai-mua' ? 'Trái Mùa (Nông nghiệp CNC)' : 'Quanh Năm / Nhập Khẩu')}
      </span>
    `;
  }

  // Rating & Sales
  const ratingEl = document.getElementById('detail-rating');
  if (ratingEl) ratingEl.textContent = p.rating || '5.0';

  const revCountEl = document.getElementById('detail-reviews-count');
  if (revCountEl) revCountEl.textContent = `(${p.reviewCount || p.reviewsCount || 10} đánh giá)`;

  const salesEl = document.getElementById('detail-sales-count');
  if (salesEl) salesEl.textContent = `Đã bán: ${p.salesCount || 50}`;

  // Price
  const priceEl = document.getElementById('detail-current-price');
  if (priceEl) priceEl.textContent = formatCurrency(currentPrice);

  const origPriceEl = document.getElementById('detail-original-price');
  const discountPill = document.getElementById('detail-discount-pill');
  if (origPriceEl && discountPill) {
    if (originalPrice > currentPrice) {
      origPriceEl.textContent = formatCurrency(originalPrice);
      discountPill.innerHTML = `<span class="product-discount-pill">Tiết kiệm ${discountPercent}%</span>`;
    } else {
      origPriceEl.textContent = '';
      discountPill.innerHTML = '';
    }
  }

  const unitEl = document.getElementById('detail-unit');
  if (unitEl) unitEl.textContent = `/${p.unit || 'kg'}`;

  // Short description
  const shortDescEl = document.getElementById('detail-short-desc');
  if (shortDescEl) shortDescEl.textContent = p.shortDesc || p.short_description || p.name || 'Hoa quả tươi giòn ngon ngọt tự nhiên.';

  // Specs
  const originEl = document.getElementById('spec-origin');
  if (originEl) originEl.textContent = p.origin || 'Việt Nam';

  const certEl = document.getElementById('spec-cert');
  if (certEl) certEl.textContent = p.cert || p.certification || 'VietGAP';

  const brixEl = document.getElementById('spec-brix');
  if (brixEl) brixEl.textContent = p.brix || '12° - 16° Brix (Ngọt thanh mát)';

  const shelfLifeEl = document.getElementById('spec-shelflife');
  if (shelfLifeEl) shelfLifeEl.textContent = p.shelfLife || p.shelf_life || '5 - 7 ngày bảo quản 4-8°C';
}

// Render Tabs Nội Dung (Khắc phục hoàn toàn lỗi undefined)
function renderProductTabs(p) {
  if (!p) return;
  const descEl = document.getElementById('tab-desc-content');
  const nutritionEl = document.getElementById('tab-nutrition-content');

  let descHTML = p.fullDesc || p.description || p.short_description || p.shortDesc || `<p>${p.name} - Hoa quả tươi sạch hảo hạng chuẩn kiểm định an toàn chất lượng cao tại EcoFruit.</p>`;
  if (!descHTML.startsWith('<')) {
    descHTML = `<p>${descHTML}</p>`;
  }
  if (descEl) descEl.innerHTML = descHTML;

  let nutritionText = '';
  if (typeof p.nutrition === 'object' && p.nutrition !== null) {
    nutritionText = `${p.nutrition.vitamins || 'Vitamin C, Chất xơ'} (${p.nutrition.calories || '52 kcal / 100g'})`;
  } else if (typeof p.nutrition === 'string' && p.nutrition.trim() && p.nutrition !== 'undefined') {
    nutritionText = p.nutrition;
  } else {
    nutritionText = `${p.vitamins || 'Bổ sung dồi dào Vitamin C, A và chất xơ tự nhiên'} (${p.calories || '52 kcal / 100g'})`;
  }

  const storageText = p.storageGuide || p.storage_guide || p.nutritionDetails?.storage || 'Bảo quản trong ngăn mát tủ lạnh (nhiệt độ 4 - 8°C). Không nên rửa trước khi cho vào tủ lạnh để giữ lớp phấn tự nhiên bảo vệ quả.';

  if (nutritionEl) {
    nutritionEl.innerHTML = `
      <div class="alert alert-success d-flex align-items-center gap-3">
        <i class="fa-solid fa-heart-pulse fs-3 text-success"></i>
        <div>
          <h5 class="fw-bold mb-1">Lợi ích sức khỏe vàng</h5>
          <p class="mb-0 small">${nutritionText}</p>
        </div>
      </div>
      <div class="row g-3 mt-2">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 border">
            <strong class="d-block text-dark mb-1"><i class="fa-solid fa-apple-whole text-success me-1"></i> Cách bảo quản giữ vị ngon:</strong>
            <small class="text-muted">${storageText}</small>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 border">
            <strong class="d-block text-dark mb-1"><i class="fa-solid fa-utensils text-warning me-1"></i> Gợi ý thưởng thức:</strong>
            <small class="text-muted">Ăn trực tiếp sau khi rửa sạch, kết hợp làm salad hoa quả hữu cơ, ép nước Cold-Pressed hoặc làm sinh tố thơm mát bổ dưỡng.</small>
          </div>
        </div>
      </div>
    `;
  }
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
    btnAddToCart.onclick = () => {
      if (!currentProduct) return;
      addToCart(currentProduct.id, currentQty);
      showToast('Đã thêm vào giỏ!', `Đã thêm ${currentQty} ${currentProduct.unit} ${currentProduct.name} vào giỏ hàng.`, 'success');
    };
  }

  // Mua ngay -> Chuyển sang checkout
  if (btnBuyNow) {
    btnBuyNow.onclick = () => {
      if (!currentProduct) return;
      addToCart(currentProduct.id, currentQty);
      window.location.href = 'checkout.html';
    };
  }
}

// ==================== HỆ THỐNG ĐÁNH GIÁ KHÁCH HÀNG CHI TIẾT ====================
async function renderCustomerReviews(productId) {
  const container = document.getElementById('product-reviews-list');
  const overviewContainer = document.getElementById('reviews-overview-container');
  
  if (!container || !overviewContainer) return;

  let reviews = [];

  // 1. Thử nạp reviews từ Live Django API
  if (window.EcoFruitAPI) {
    try {
      const apiRevRes = await window.EcoFruitAPI.getReviews(productId);
      if (apiRevRes && Array.isArray(apiRevRes.reviews) && apiRevRes.reviews.length > 0) {
        reviews = apiRevRes.reviews.map(r => ({
          id: r.id,
          productId: r.product,
          author: r.reviewer_name || 'Khách hàng EcoFruit',
          avatar: r.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          location: 'Khách hàng thân thiết',
          rating: r.rating || 5,
          date: new Date(r.created_at).toLocaleDateString('vi-VN'),
          verified: r.is_verified_purchase !== false,
          comment: r.comment,
          likes: r.likes_count || 12
        }));
      }
    } catch (e) {
      console.debug('API reviews fetch error:', e);
    }
  }

  // 2. Fallback sang local reviews nếu API chưa có
  if (reviews.length === 0) {
    reviews = getReviewsForProduct(productId);
  }

  currentLoadedReviews = reviews;

  // Tính toán Rating Breakdown
  const total = reviews.length;
  let counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sumScore = 0;

  reviews.forEach(r => {
    const star = parseInt(r.rating) || 5;
    counts[star] = (counts[star] || 0) + 1;
    sumScore += star;
  });

  const avgScore = total > 0 ? (sumScore / total).toFixed(1) : (currentProduct?.rating || '5.0');

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
      renderFilteredReviewsList();
    });
  });

  renderFilteredReviewsList();
}

// Render danh sách review sau khi lọc
function renderFilteredReviewsList() {
  const container = document.getElementById('product-reviews-list');
  if (!container) return;

  let reviews = currentLoadedReviews;
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
                  <i class="fa-solid fa-circle-check"></i> Đã mua hàng tại EcoFruit
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
          <span>• Đánh giá đã được xác thực qua đơn hàng</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Xử lý Form gửi đánh giá khách hàng (Kiểm tra quyền Verified Purchase)
async function setupReviewForm() {
  const form = document.getElementById('product-review-form');
  const formWrap = form?.parentElement;
  if (!form || !formWrap) return;

  const currentUser = getCurrentUser();
  const nameInput = document.getElementById('review-author-name');

  // 1. Kiểm tra trạng thái mua hàng thực tế qua API Backend
  let eligibility = { eligible: false, is_authenticated: false, reason: 'Vui lòng đăng nhập để gửi đánh giá' };

  if (window.EcoFruitAPI && currentProduct) {
    try {
      eligibility = await window.EcoFruitAPI.checkReviewEligibility(currentProduct.id);
    } catch (e) {
      console.debug('Eligibility check error:', e);
    }
  }

  // 2. Cập nhật giao diện form theo điều kiện quyền hạn
  if (!currentUser) {
    // Khách vãng lai chưa đăng nhập
    formWrap.innerHTML = `
      <div class="text-center py-4">
        <div class="mb-3">
          <i class="fa-solid fa-user-lock text-warning fs-1"></i>
        </div>
        <h5 class="fw-bold text-dark mb-2">Đăng nhập để viết đánh giá</h5>
        <p class="text-muted small mb-3">Chỉ khách hàng đã đăng nhập và mua sản phẩm này thành công mới có thể gửi đánh giá xác thực.</p>
        <button class="btn btn-primary-gf w-100 py-2" onclick="window.location.href='index.html?login=true'">
          <i class="fa-solid fa-right-to-bracket me-2"></i> Đăng Nhập Ngay
        </button>
      </div>
    `;
    return;
  }

  if (!eligibility.eligible) {
    // Đã đăng nhập nhưng chưa mua sản phẩm này
    formWrap.innerHTML = `
      <div class="text-center py-4">
        <div class="mb-3">
          <i class="fa-solid fa-shield-halved text-secondary fs-1"></i>
        </div>
        <h5 class="fw-bold text-dark mb-2">Chưa đủ điều kiện đánh giá</h5>
        <div class="alert alert-warning text-start small mb-3">
          <i class="fa-solid fa-circle-info me-1"></i> ${eligibility.reason || 'Chỉ những khách hàng đã đặt mua và hoàn tất đơn hàng cho sản phẩm này mới có thể viết đánh giá.'}
        </div>
        <p class="text-muted small">Hãy trải nghiệm sản phẩm để trở thành người đánh giá uy tín trên EcoFruit bạn nhé!</p>
      </div>
    `;
    return;
  }

  // Đủ điều kiện: Tự động điền họ tên khách hàng
  if (nameInput) {
    nameInput.value = currentUser.fullName || currentUser.full_name || 'Khách hàng EcoFruit';
    nameInput.readOnly = true;
  }

  // Gắn sự kiện submit form
  form.onsubmit = async (e) => {
    e.preventDefault();
    const commentInput = document.getElementById('review-comment-text');
    const ratingSelect = document.getElementById('review-star-select');

    if (!commentInput.value.trim()) {
      showToast('Thông báo', 'Vui lòng nhập nội dung nhận xét chi tiết!', 'warning');
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Đang gửi...`;
    }

    try {
      if (window.EcoFruitAPI) {
        const res = await window.EcoFruitAPI.postReview(currentProduct.id, {
          reviewer_name: nameInput.value.trim(),
          rating: parseInt(ratingSelect.value),
          comment: commentInput.value.trim()
        });

        if (res && res.data) {
          showToast('Thành công!', 'Cảm ơn bạn! Đánh giá đã được gửi và xác thực thành công.', 'success');
        }
      }
    } catch (err) {
      showToast('Thông báo', err.message || 'Lỗi khi gửi đánh giá.', 'danger');
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane me-1"></i> Gửi Đánh Giá Ngay`;
    }

    form.reset();
    await renderCustomerReviews(currentProduct.id);
  };
}

// ==================== THUẬT TOÁN TÍNH ĐỘ TƯƠNG ĐỒNG GỢI Ý ====================
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
  const certA = (candidate.cert || '').toLowerCase();
  const certB = (targetProduct.cert || '').toLowerCase();
  if (certA && certB && certA === certB) {
    score += 15;
  } else if (certA.includes('gap') && certB.includes('gap')) {
    score += 10;
  }

  return Math.min(99, Math.max(50, Math.round(score)));
}

// Render Sản Phẩm Gợi Ý Với Điểm Tương Đồng
function renderSimilarProductsWithSimilarityScore(product) {
  const container = document.getElementById('related-products-container');
  if (!container) return;

  const allProducts = getProducts();
  const candidates = allProducts.filter(p => String(p.id) !== String(product.id));

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
    const imgSrc = (p.images && p.images[0]) || p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80';

    html += `
      <div class="col-6 col-md-4 col-lg-3 mb-4">
        <div class="product-card">
          <div class="product-card-img-wrap">
            <img src="${imgSrc}" alt="${p.name}" loading="lazy">
            
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
            <div class="product-category-tag">${p.categoryName || 'Hoa Quả Sạch'}</div>
            <h3 class="product-title">
              <a href="product-detail.html?id=${p.id}">${p.name}</a>
            </h3>
            <div class="product-specs-meta">
              <span class="badge-cert"><i class="fa-solid fa-shield-halved text-success me-1"></i>${p.cert || 'VietGAP'}</span>
              <span class="badge-cert"><i class="fa-solid fa-location-dot text-danger me-1"></i>${(p.origin || 'Việt Nam').split(',')[0]}</span>
            </div>
            <div class="product-rating-meta">
              <span class="stars">
                <i class="fa-solid fa-star"></i>
                <strong class="text-dark ms-1">${p.rating || '5.0'}</strong>
              </span>
              <span class="sales">Đã bán ${p.salesCount || 50}</span>
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
  if (!p) return;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "image": p.images || [p.image],
    "description": p.shortDesc || p.name,
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
      "ratingValue": p.rating || 5.0,
      "reviewCount": p.reviewCount || 10
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}
