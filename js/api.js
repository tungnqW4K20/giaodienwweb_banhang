/**
 * EcoFruit Enterprise API Client & Progressive Data Adapter
 * Seamlessly connects Frontend to Python Django REST Backend
 * with real-time MySQL database hydration and zero-fail fallback.
 */

const API_CONFIG = {
  BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api/v1'
    : '/api/v1',
  TIMEOUT_MS: 5000,
  isBackendConnected: false
};

class ApiClient {
  static getToken() {
    return localStorage.getItem('ecofruit_access_token');
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('ecofruit_access_token', token);
    } else {
      localStorage.removeItem('ecofruit_access_token');
      localStorage.removeItem('ecofruit_refresh_token');
    }
  }

  static getUser() {
    try {
      const u = localStorage.getItem('ecofruit_current_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  static setUser(user) {
    if (user) {
      localStorage.setItem('ecofruit_current_user', JSON.stringify(user));
      // Normalize & Sync to gf_current_user for universal UI compatibility
      const normalized = {
        id: user.id,
        fullName: user.full_name || user.fullName || 'Thành viên EcoFruit',
        email: user.email,
        phone: user.phone_number || user.phone || '',
        avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        role: user.role || 'CUSTOMER',
        membership: user.role === 'ADMIN' ? 'Quản trị viên EcoFruit' : (user.role === 'STAFF' ? 'Nhân viên quản lý' : 'Khách hàng VIP EcoFruit'),
        points: user.loyalty_points !== undefined ? user.loyalty_points : (user.points || 0),
        walletBalance: Number(user.balance !== undefined ? user.balance : (user.walletBalance || 0)),
        address: user.addresses?.[0]?.detail_address || user.address || 'Hà Nội'
      };
      localStorage.setItem('gf_current_user', JSON.stringify(normalized));
    } else {
      localStorage.removeItem('ecofruit_current_user');
      localStorage.removeItem('gf_current_user');
    }
  }

  static async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.message || `Lỗi máy chủ (${response.status})`);
      }
      API_CONFIG.isBackendConnected = true;
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      if (API_CONFIG.DEBUG) {
        console.debug(`[EcoFruit API] (${endpoint}):`, err.message);
      }
      throw err;
    }
  }

  // =========================================================================
  // HEALTH & BACKEND STATUS
  // =========================================================================
  static async checkHealth() {
    try {
      const res = await this.request('/health/');
      API_CONFIG.isBackendConnected = (res.status === 'online');
      return res;
    } catch {
      API_CONFIG.isBackendConnected = false;
      return null;
    }
  }

  // =========================================================================
  // PRODUCTS & CATEGORIES
  // =========================================================================
  static async getCategories() {
    try {
      const res = await this.request('/products/categories/');
      return res.data || [];
    } catch {
      return null;
    }
  }

  static async getProducts(params = {}) {
    const qs = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        qs.append(k, params[k]);
      }
    });
    const endpoint = `/products/?${qs.toString()}`;
    try {
      const res = await this.request(endpoint);
      return res;
    } catch {
      return null;
    }
  }

  static async getProductDetail(idOrSlug) {
    try {
      const res = await this.request(`/products/${idOrSlug}/`);
      return res.data;
    } catch {
      return null;
    }
  }

  static async getSimilarProducts(productId) {
    try {
      const res = await this.request(`/products/${productId}/similar/`);
      return res.data || [];
    } catch {
      return [];
    }
  }

  // =========================================================================
  // VOUCHERS
  // =========================================================================
  static async getVouchers() {
    try {
      const res = await this.request('/vouchers/');
      return res.data || [];
    } catch {
      return [];
    }
  }

  static async validateVoucher(code, subtotal) {
    return this.request('/vouchers/apply/', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  }

  // =========================================================================
  // AUTHENTICATION & PROFILE (EXPERT ZERO-CACHE INTEGRATION)
  // =========================================================================
  static async register(userData) {
    // 1. Purge any stale user caches before registering new account
    this.purgeLocalUserCache();

    const res = await this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.data && res.data.tokens) {
      this.setToken(res.data.tokens.access_token);
      if (res.data.tokens.refresh_token) {
        localStorage.setItem('ecofruit_refresh_token', res.data.tokens.refresh_token);
      }
      this.setUser(res.data.user);
      window.dispatchEvent(new CustomEvent('ecofruit:auth-changed', { detail: { action: 'register', user: res.data.user } }));
    }
    return res;
  }

  static async login(email, password) {
    // 1. Purge all previous user state to guarantee ZERO leakage
    this.purgeLocalUserCache();

    const res = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.data && res.data.tokens) {
      this.setToken(res.data.tokens.access_token);
      if (res.data.tokens.refresh_token) {
        localStorage.setItem('ecofruit_refresh_token', res.data.tokens.refresh_token);
      }
      this.setUser(res.data.user);

      // Fetch fresh profile with cache-busting to ensure 100% accurate balance, points & addresses
      try {
        await this.getProfile();
      } catch (e) {
        console.debug('Profile fetch sync:', e);
      }

      // Fetch fresh member DB cart immediately to populate badge & local session
      try {
        const cartData = await this.getCart();
        if (cartData && Array.isArray(cartData.items)) {
          const syncedItems = cartData.items.map(it => {
            const p = it.product || {};
            return {
              id: String(p.id || it.id),
              product_id: p.id || it.id,
              name: p.name || '',
              price: Number(it.unit_price || p.price || 0),
              qty: Number(it.quantity || 1),
              unit: p.unit || 'kg',
              image: p.image || '',
              cart_item_id: it.id
            };
          });
          localStorage.setItem('gf_cart', JSON.stringify(syncedItems));
        }
      } catch (e) {
        console.debug('Member cart fetch:', e);
      }

      window.dispatchEvent(new CustomEvent('ecofruit:auth-changed', { detail: { action: 'login', user: res.data.user } }));
    }
    return res;
  }

  static async logout(redirectUrl = 'auth.html?mode=login&logged_out=1') {
    try {
      // 1. Notify Backend of logout (invalidate token / session)
      if (this.getToken()) {
        await this.request('/auth/logout/', { method: 'POST' }).catch(() => {});
      }
    } catch (e) {
      // Non-blocking logout
    }

    // 2. Completely eradicate all user tokens, credentials, caches, carts, orders & wallets
    this.purgeLocalUserCache();

    // 3. Dispatch global auth state change
    window.dispatchEvent(new CustomEvent('ecofruit:auth-changed', { detail: { action: 'logout', user: null } }));

    // 4. Redirect cleanly to login window
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }

  static purgeLocalUserCache() {
    this.setToken(null);
    this.setUser(null);
    localStorage.removeItem('ecofruit_refresh_token');
    localStorage.removeItem('gf_cart');
    localStorage.removeItem('gf_orders');
    localStorage.removeItem('gf_vnpay_wallets');
    localStorage.removeItem('gf_applied_voucher');
    sessionStorage.clear();
  }

  static async getProfile() {
    // Cache-busting timestamp parameter to prevent 304 or browser HTTP stale cache
    const res = await this.request(`/auth/profile/?_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    if (res.data) {
      this.setUser(res.data);
    }
    return res.data;
  }

  static async updateProfile(data) {
    const res = await this.request('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.data) {
      this.setUser(res.data);
    }
    return res.data;
  }

  static async topUpWallet(amount) {
    return this.request('/auth/wallet/topup/', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }


  // =========================================================================
  // CART & MERGING
  // =========================================================================
  static async getCart() {
    try {
      const res = await this.request('/cart/');
      return res.data;
    } catch {
      return null;
    }
  }

  static async addToCart(productId, quantity = 1) {
    return this.request('/cart/', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  static async updateCartItem(itemId, quantity) {
    return this.request(`/cart/items/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  static async removeCartItem(itemId) {
    return this.request(`/cart/items/${itemId}/`, {
      method: 'DELETE',
    });
  }

  static async mergeCart(items) {
    return this.request('/cart/merge/', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // =========================================================================
  // ORDERS & CHECKOUT
  // =========================================================================
  static async checkout(orderData) {
    return this.request('/orders/checkout/', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  static async getOrders(phone = null, code = null) {
    let endpoint = '/orders/';
    if (phone) endpoint += `?phone=${encodeURIComponent(phone)}`;
    else if (code) endpoint += `?code=${encodeURIComponent(code)}`;
    const res = await this.request(endpoint);
    return res.data || [];
  }

  static async getOrderDetail(orderCode) {
    const res = await this.request(`/orders/${orderCode}/`);
    return res.data;
  }

  static async cancelOrder(orderCode, reason = '') {
    return this.request(`/orders/${orderCode}/cancel/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async updateOrderAddress(orderCode, addressData) {
    return this.request(`/orders/${orderCode}/address/`, {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  // =========================================================================
  // REVIEWS & FEEDBACK
  // =========================================================================
  static async getProductReviews(productId) {
    try {
      const res = await this.request(`/reviews/products/${productId}/`);
      return res.data;
    } catch {
      return null;
    }
  }

  static async postReview(productId, reviewData) {
    return this.request(`/reviews/products/${productId}/`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  // =========================================================================
  // AI ASSISTANT CHAT
  // =========================================================================
  static async askAI(message, history = []) {
    return this.request('/ai/chat/', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }

  // =========================================================================
  // REAL-TIME SSE NOTIFICATIONS
  // =========================================================================
  static initRealtimeNotifications(onMessageCallback) {
    try {
      const sseUrl = `${API_CONFIG.BASE_URL}/notifications/stream/`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageCallback && typeof onMessageCallback === 'function') {
            onMessageCallback(data);
          }
        } catch {}
      };

      return eventSource;
    } catch (e) {
      console.log('SSE notification fallback:', e);
      return null;
    }
  }

  // =========================================================================
  // REVIEWS & RATINGS
  // =========================================================================
  static async getReviews(productId) {
    try {
      const res = await this.request(`/reviews/products/${productId}/`);
      return res.data;
    } catch {
      return null;
    }
  }

  static async checkReviewEligibility(productId) {
    try {
      const res = await this.request(`/reviews/products/${productId}/eligibility/`);
      return res.data;
    } catch {
      return { eligible: false, reason: 'Chưa xác thực' };
    }
  }

  static async postReview(productId, reviewData) {
    return this.request(`/reviews/products/${productId}/`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  // =========================================================================
  // AUTOMATIC BACKEND HYDRATION BRIDGE (LIVE DATA SYNC)
  // =========================================================================
  static async syncFromBackend() {
    try {
      const health = await this.checkHealth();
      if (!health || health.status !== 'online') return false;

      // 1. Fetch Products from MySQL
      const prodRes = await this.getProducts({ page_size: 100 });
      if (prodRes && prodRes.data && prodRes.data.length > 0) {
        const transformedProducts = prodRes.data.map(p => {
          let catKey = 'noi-dia';
          if (p.category_slug) catKey = p.category_slug;
          else if (p.category === 1) catKey = 'nhap-khau';

          let seasonKey = 'dung-mua';
          if (p.season === 'OFF_SEASON') seasonKey = 'trai-mua';
          else if (p.season === 'ALL_YEAR') seasonKey = 'quanh-nam';

          const descText = p.description || p.short_description || `${p.name} - Hoa quả tươi sạch thượng hạng tuyển chọn tại EcoFruit, cam kết độ tươi giòn và ngọt tự nhiên.`;
          const shortDescText = p.short_description || p.name;
          const nutritionSummary = p.vitamins 
            ? `${p.vitamins} (${p.calories || '52 kcal / 100g'})` 
            : 'Bổ sung dồi dào Vitamin C, chất xơ tự nhiên, thanh lọc cơ thể và tăng đề kháng.';

          return {
            id: String(p.id),
            sku: p.sku || `SKU-${p.id}`,
            name: p.name,
            slug: p.slug,
            category: catKey,
            categoryId: String(p.category),
            categoryName: p.category_name || 'Hoa Quả Tươi',
            season: seasonKey,
            seasonName: p.season_display || (seasonKey === 'dung-mua' ? 'Đúng Mùa Vụ' : 'Trái Mùa Tuyển Chọn'),
            price: Number(p.price),
            originalPrice: Number(p.original_price || p.price),
            unit: p.unit || 'kg',
            stock: Number(p.stock || 100),
            salesCount: Number(p.sold_count || 50),
            rating: Number(p.rating || 5.0),
            reviewsCount: Number(p.review_count || 10),
            reviewCount: Number(p.review_count || 10),
            origin: p.origin || 'Việt Nam',
            cert: p.certification || 'VietGAP',
            certType: 'vietgap',
            brix: p.brix || '12° - 16° Brix (Ngọt thanh mát)',
            shelfLife: p.shelf_life || '5 - 7 ngày bảo quản ngăn mát 4-8°C',
            images: [p.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80'],
            shortDesc: shortDescText,
            description: descText,
            fullDesc: descText.startsWith('<') ? descText : `<p>${descText}</p>`,
            nutrition: nutritionSummary,
            nutritionDetails: {
              calories: p.calories || '52 kcal / 100g',
              vitamins: p.vitamins || 'Vitamin C, A, Chất xơ',
              storage: p.storage_guide || 'Bảo quản ngăn mát tủ lạnh 4-8 độ C',
              shelfLife: p.shelf_life || '5 - 7 ngày'
            },
            tags: p.tags || '',
            isFlashSale: (p.discount_percent > 15) || p.is_bestseller,
            isFeatured: p.is_featured,
            isBestSeller: p.is_bestseller
          };
        });

        localStorage.setItem('gf_products', JSON.stringify(transformedProducts));
        console.log(`[EcoFruit API] Đã nạp thành công ${transformedProducts.length} sản phẩm trực tiếp từ MySQL Backend!`);
      }

      // 2. Fetch Vouchers from MySQL
      const vouchers = await this.getVouchers();
      if (vouchers && vouchers.length > 0) {
        const transformedVouchers = vouchers.map(v => ({
          code: v.code,
          title: v.title,
          description: v.description,
          discountType: v.discount_type === 'PERCENT' ? 'percent' : 'fixed',
          discountValue: Number(v.discount_value),
          maxDiscount: Number(v.max_discount_amount || 100000),
          minOrder: Number(v.min_order_amount || 0)
        }));
        localStorage.setItem('gf_vouchers', JSON.stringify(transformedVouchers));
      }

      // 3. Dispatch Live Data Ready Event for UI
      window.dispatchEvent(new CustomEvent('ecofruit:data-synced', {
        detail: { count: prodRes?.data?.length || 0, source: 'Django-MySQL' }
      }));

      return true;
    } catch (e) {
      return false;
    }
  }
}

// Attach globally
window.EcoFruitAPI = ApiClient;

// Auto-hydrate on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ApiClient.syncFromBackend();
  });
}
