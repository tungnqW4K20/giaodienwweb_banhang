/**
 * GreenFruit Eco - Products Catalog & Multi-Dimensional Filter Logic
 * Xử lý lọc theo danh mục, theo mùa vụ (đúng mùa/trái mùa), theo khoảng giá, tìm kiếm và sắp xếp.
 */

let currentFilters = {
  category: 'tat-ca',
  season: 'tat-ca',
  priceRange: 'all',
  minPrice: 0,
  maxPrice: 5000000,
  cert: 'all',
  health: '',
  sale: false,
  rating: 0,
  search: '',
  sort: 'bestseller',
  viewMode: 'grid'
};

document.addEventListener('DOMContentLoaded', () => {
  parseUrlParams();
  setupFilterEventListeners();
  renderCategoryCounts();
  applyFiltersAndRender();
});

// Lắng nghe sự kiện đồng bộ dữ liệu trực tiếp từ Python Django / MySQL API
window.addEventListener('ecofruit:data-synced', (e) => {
  console.log(`[Products] Cập nhật catalog từ ${e.detail?.source || 'API'}: ${e.detail?.count || 0} sản phẩm`);
  renderCategoryCounts();
  applyFiltersAndRender();
});

// ==================== ĐỌC THAM SỐ TỪ URL ====================
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('category')) {
    currentFilters.category = urlParams.get('category');
    const radio = document.querySelector(`input[name="categoryFilter"][value="${currentFilters.category}"]`);
    if (radio) radio.checked = true;
  }
  
  if (urlParams.has('season')) {
    currentFilters.season = urlParams.get('season');
    const radio = document.querySelector(`input[name="seasonFilter"][value="${currentFilters.season}"]`);
    if (radio) radio.checked = true;
  }

  if (urlParams.has('health')) {
    currentFilters.health = urlParams.get('health');
  }

  if (urlParams.has('sale')) {
    currentFilters.sale = urlParams.get('sale') === 'true';
  }

  if (urlParams.has('search')) {
    currentFilters.search = urlParams.get('search');
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) searchInput.value = currentFilters.search;
  }

  if (urlParams.has('sort')) {
    currentFilters.sort = urlParams.get('sort');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = currentFilters.sort;
  }
}

// ==================== THIẾT LẬP SỰ KIỆN BỘ LỌC ====================
function setupFilterEventListeners() {
  // 1. Lọc Danh mục
  const catRadios = document.querySelectorAll('input[name="categoryFilter"]');
  catRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      updateUrl();
      applyFiltersAndRender();
    });
  });

  // 2. Lọc Mùa vụ
  const seasonRadios = document.querySelectorAll('input[name="seasonFilter"]');
  seasonRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentFilters.season = e.target.value;
      updateUrl();
      applyFiltersAndRender();
    });
  });

  // 3. Lọc Khoảng giá dạng Pills
  const pricePills = document.querySelectorAll('.price-pill-btn');
  pricePills.forEach(btn => {
    btn.addEventListener('click', () => {
      pricePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range;
      currentFilters.priceRange = range;

      if (range === 'under100') {
        currentFilters.minPrice = 0;
        currentFilters.maxPrice = 100000;
      } else if (range === '100to300') {
        currentFilters.minPrice = 100000;
        currentFilters.maxPrice = 300000;
      } else if (range === '300to700') {
        currentFilters.minPrice = 300000;
        currentFilters.maxPrice = 700000;
      } else if (range === 'above700') {
        currentFilters.minPrice = 700000;
        currentFilters.maxPrice = 5000000;
      } else {
        currentFilters.minPrice = 0;
        currentFilters.maxPrice = 5000000;
      }

      applyFiltersAndRender();
    });
  });

  // 4. Lọc Chứng nhận
  const certSelect = document.getElementById('filter-cert-select');
  if (certSelect) {
    certSelect.addEventListener('change', (e) => {
      currentFilters.cert = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 5. Ô tìm kiếm trong trang sản phẩm
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value.trim();
      updateUrl();
      applyFiltersAndRender();
    });
  }

  // 6. Sắp xếp
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      updateUrl();
      applyFiltersAndRender();
    });
  }

  // 7. Chuyển đổi Grid / List view
  const btnGrid = document.getElementById('btn-view-grid');
  const btnList = document.getElementById('btn-view-list');
  const container = document.getElementById('products-grid-container');

  if (btnGrid && btnList && container) {
    btnGrid.addEventListener('click', () => {
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
      container.classList.remove('product-list-view');
      currentFilters.viewMode = 'grid';
    });

    btnList.addEventListener('click', () => {
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
      container.classList.add('product-list-view');
      currentFilters.viewMode = 'list';
    });
  }

  // 8. Nút xóa toàn bộ bộ lọc
  const btnReset = document.getElementById('btn-reset-filters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetAllFilters();
    });
  }
}

// Reset filters
function resetAllFilters() {
  currentFilters = {
    category: 'tat-ca',
    season: 'tat-ca',
    priceRange: 'all',
    minPrice: 0,
    maxPrice: 5000000,
    cert: 'all',
    rating: 0,
    search: '',
    sort: 'bestseller',
    viewMode: currentFilters.viewMode
  };

  // Reset inputs UI
  const defaultCatRadio = document.querySelector('input[name="categoryFilter"][value="tat-ca"]');
  if (defaultCatRadio) defaultCatRadio.checked = true;

  const defaultSeasonRadio = document.querySelector('input[name="seasonFilter"][value="tat-ca"]');
  if (defaultSeasonRadio) defaultSeasonRadio.checked = true;

  const pricePills = document.querySelectorAll('.price-pill-btn');
  pricePills.forEach(b => b.classList.remove('active'));
  const allPricePill = document.querySelector('.price-pill-btn[data-range="all"]');
  if (allPricePill) allPricePill.classList.add('active');

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) searchInput.value = '';

  const certSelect = document.getElementById('filter-cert-select');
  if (certSelect) certSelect.value = 'all';

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'bestseller';

  window.history.pushState({}, '', 'products.html');
  applyFiltersAndRender();
}

// Cập nhật số lượng sản phẩm cho từng danh mục trên sidebar
function renderCategoryCounts() {
  const products = getProducts();
  
  const countAll = products.length;
  const countNoiDia = products.filter(p => p.category === 'noi-dia').length;
  const countNhapKhau = products.filter(p => p.category === 'nhap-khau').length;
  const countHopQua = products.filter(p => p.category === 'hop-qua').length;
  const countSay = products.filter(p => p.category === 'say-nuoc-ep').length;

  const setEl = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };

  setEl('count-cat-all', countAll);
  setEl('count-cat-noi-dia', countNoiDia);
  setEl('count-cat-nhap-khau', countNhapKhau);
  setEl('count-cat-hop-qua', countHopQua);
  setEl('count-cat-say', countSay);

  // Mùa vụ
  setEl('count-season-all', countAll);
  setEl('count-season-in', products.filter(p => p.season === 'dung-mua').length);
  setEl('count-season-out', products.filter(p => p.season === 'trai-mua').length);
  setEl('count-season-round', products.filter(p => p.season === 'quanh-nam').length);
}

// ==================== LỌC, SẮP XẾP VÀ HIỂN THỊ ====================
function applyFiltersAndRender() {
  const products = getProducts();
  let result = [...products];

  // 1. Lọc theo Danh mục
  if (currentFilters.category && currentFilters.category !== 'tat-ca') {
    result = result.filter(p => p.category === currentFilters.category);
  }

  // 2. Lọc theo Mùa vụ (Yêu cầu cốt lõi)
  if (currentFilters.season && currentFilters.season !== 'tat-ca') {
    result = result.filter(p => p.season === currentFilters.season);
  }

  // 3. Lọc theo Khoảng giá
  result = result.filter(p => p.price >= currentFilters.minPrice && p.price <= currentFilters.maxPrice);

  // 4. Lọc theo Chứng nhận
  if (currentFilters.cert && currentFilters.cert !== 'all') {
    result = result.filter(p => p.cert.toLowerCase().includes(currentFilters.cert.toLowerCase()));
  }

  // 5. Lọc theo Từ khóa tìm kiếm
  if (currentFilters.search) {
    const q = currentFilters.search.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.origin.toLowerCase().includes(q) || 
      (p.shortDesc && p.shortDesc.toLowerCase().includes(q))
    );
  }

  // 6. Lọc theo Sức khỏe / Nhu cầu chuyên sâu (Tích hợp từ Chatbot AI)
  if (currentFilters.health) {
    const h = currentFilters.health.toLowerCase();
    if (h === 'tieu-duong') {
      result = result.filter(p => {
        const text = (p.name + ' ' + (p.shortDesc || '') + ' ' + (p.nutrition || '') + ' ' + (p.tags || '')).toLowerCase();
        return text.includes('bưởi') || text.includes('bơ') || text.includes('táo') || text.includes('kiwi') || text.includes('dâu') || text.includes('tiểu đường') || text.includes('ít đường');
      });
    } else if (h === 'giam-can') {
      result = result.filter(p => {
        const text = (p.name + ' ' + (p.shortDesc || '') + ' ' + (p.nutrition || '')).toLowerCase();
        return text.includes('bưởi') || text.includes('táo') || text.includes('kiwi') || text.includes('dâu') || text.includes('giảm cân');
      });
    } else if (h === 'me-bau') {
      result = result.filter(p => {
        const text = (p.name + ' ' + (p.shortDesc || '') + ' ' + (p.nutrition || '')).toLowerCase();
        return text.includes('bơ') || text.includes('cam') || text.includes('nho') || text.includes('kiwi') || text.includes('bầu');
      });
    }
  }

  // 7. Lọc theo Khuyến mãi / Hot Sale
  if (currentFilters.sale) {
    result = result.filter(p => (p.originalPrice > p.price) || p.isFlashSale || p.isBestSeller);
  }

  // 8. Sắp xếp
  if (currentFilters.sort === 'price-asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (currentFilters.sort === 'price-desc') {
    result.sort((a, b) => b.price - a.price);
  } else if (currentFilters.sort === 'bestseller') {
    result.sort((a, b) => b.salesCount - a.salesCount);
  } else if (currentFilters.sort === 'discount') {
    result.sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price));
  } else if (currentFilters.sort === 'newest') {
    result.reverse();
  }

  // Render HTML
  renderActiveFilterTags();
  renderProductsList(result);
}

// Render các thẻ tag lọc đang hoạt động
function renderActiveFilterTags() {
  const container = document.getElementById('active-filters-container');
  if (!container) return;

  let tagsHTML = '';

  if (currentFilters.health) {
    const healthLabels = {
      'tieu-duong': '🩺 Tốt cho người tiểu đường (Low GI)',
      'giam-can': '🥗 Giảm cân & Giữ dáng',
      'me-bau': '🤰 Bổ dưỡng cho mẹ bầu'
    };
    tagsHTML += `
      <span class="active-filter-tag bg-success text-white">
        ${healthLabels[currentFilters.health] || 'Tư vấn sức khỏe'}
        <button class="btn-remove-filter text-white" onclick="removeFilter('health')">×</button>
      </span>
    `;
  }

  if (currentFilters.sale) {
    tagsHTML += `
      <span class="active-filter-tag bg-danger text-white">
        🔥 Khuyến Mãi / Hot Sale
        <button class="btn-remove-filter text-white" onclick="removeFilter('sale')">×</button>
      </span>
    `;
  }

  if (currentFilters.category !== 'tat-ca') {
    const catName = document.querySelector(`input[name="categoryFilter"][value="${currentFilters.category}"]`)?.nextElementSibling?.textContent || currentFilters.category;
    tagsHTML += `
      <span class="active-filter-tag">
        Danh mục: ${catName}
        <button class="btn-remove-filter" onclick="removeFilter('category')">×</button>
      </span>
    `;
  }

  if (currentFilters.season !== 'tat-ca') {
    const seasonName = currentFilters.season === 'dung-mua' ? 'Đúng Mùa' : (currentFilters.season === 'trai-mua' ? 'Trái Mùa' : 'Quanh Năm');
    tagsHTML += `
      <span class="active-filter-tag">
        Mùa vụ: ${seasonName}
        <button class="btn-remove-filter" onclick="removeFilter('season')">×</button>
      </span>
    `;
  }

  if (currentFilters.priceRange !== 'all') {
    tagsHTML += `
      <span class="active-filter-tag">
        Giá: ${formatCurrency(currentFilters.minPrice)} - ${formatCurrency(currentFilters.maxPrice)}
        <button class="btn-remove-filter" onclick="removeFilter('price')">×</button>
      </span>
    `;
  }

  if (currentFilters.search) {
    tagsHTML += `
      <span class="active-filter-tag">
        Tìm kiếm: "${currentFilters.search}"
        <button class="btn-remove-filter" onclick="removeFilter('search')">×</button>
      </span>
    `;
  }

  container.innerHTML = tagsHTML;
}

// Xóa từng tag lọc
function removeFilter(type) {
  if (type === 'health') {
    currentFilters.health = '';
  } else if (type === 'sale') {
    currentFilters.sale = false;
  } else if (type === 'category') {
    currentFilters.category = 'tat-ca';
    const catRadio = document.querySelector('input[name="categoryFilter"][value="tat-ca"]');
    if (catRadio) catRadio.checked = true;
  } else if (type === 'season') {
    currentFilters.season = 'tat-ca';
    const seasonRadio = document.querySelector('input[name="seasonFilter"][value="tat-ca"]');
    if (seasonRadio) seasonRadio.checked = true;
  } else if (type === 'price') {
    currentFilters.priceRange = 'all';
    currentFilters.minPrice = 0;
    currentFilters.maxPrice = 5000000;
    document.querySelectorAll('.price-pill-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.price-pill-btn[data-range="all"]')?.classList.add('active');
  } else if (type === 'search') {
    currentFilters.search = '';
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) searchInput.value = '';
  }
  updateUrl();
  applyFiltersAndRender();
}
window.removeFilter = removeFilter;

// Render danh sách sản phẩm
function renderProductsList(products) {
  const container = document.getElementById('products-grid-container');
  const countEl = document.getElementById('product-results-count');
  
  if (countEl) {
    countEl.textContent = products.length;
  }

  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="p-5 bg-white rounded-4 border">
          <i class="fa-solid fa-apple-whole text-muted" style="font-size: 60px;"></i>
          <h4 class="fw-bold mt-3 mb-2">Không tìm thấy sản phẩm phù hợp</h4>
          <p class="text-muted">Quý khách hãy thử điều chỉnh lại bộ lọc mùa vụ, mức giá hoặc từ khóa tìm kiếm.</p>
          <button class="btn btn-primary-gf mt-2" onclick="resetAllFilters()">
            <i class="fa-solid fa-rotate-left me-1"></i> Xóa tất cả bộ lọc
          </button>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  products.forEach(p => {
    html += renderProductCardHTML(p);
  });

  container.innerHTML = html;
}

// Cập nhật URL Query
function updateUrl() {
  const params = new URLSearchParams();
  if (currentFilters.category !== 'tat-ca') params.set('category', currentFilters.category);
  if (currentFilters.season !== 'tat-ca') params.set('season', currentFilters.season);
  if (currentFilters.search) params.set('search', currentFilters.search);
  if (currentFilters.sort !== 'bestseller') params.set('sort', currentFilters.sort);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl.endsWith('?') ? window.location.pathname : newUrl);
}
