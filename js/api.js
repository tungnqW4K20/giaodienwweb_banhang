/**
 * EcoFruit Enterprise API Client & Progressive Data Adapter
 * Seamlessly connects Frontend to Python Django REST Backend
 * with zero-fail fallback to LocalStorage if offline.
 */

const API_CONFIG = {
  BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api/v1'
    : '/api/v1',
  TIMEOUT_MS: 8000,
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
    } else {
      localStorage.removeItem('ecofruit_current_user');
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
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[EcoFruit API] Backend request failed (${endpoint}):`, err.message);
      throw err;
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
  // AUTHENTICATION & PROFILE
  // =========================================================================
  static async register(userData) {
    const res = await this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.data && res.data.tokens) {
      this.setToken(res.data.tokens.access_token);
      this.setUser(res.data.user);
    }
    return res;
  }

  static async login(email, password) {
    const res = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data && res.data.tokens) {
      this.setToken(res.data.tokens.access_token);
      this.setUser(res.data.user);

      // Auto merge local storage cart items into DB
      try {
        const localCart = JSON.parse(localStorage.getItem('ecofruit_cart') || '[]');
        if (localCart.length > 0) {
          await this.mergeCart(localCart.map(i => ({ product_id: i.id, quantity: i.quantity })));
        }
      } catch (e) {
        console.log('Cart merge optional step:', e);
      }
    }
    return res;
  }

  static logout() {
    this.setToken(null);
    this.setUser(null);
    window.location.reload();
  }

  static async getProfile() {
    const res = await this.request('/auth/profile/');
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

  static async cancelOrder(orderCode) {
    return this.request(`/orders/${orderCode}/cancel/`, {
      method: 'POST',
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

      eventSource.onerror = () => {
        // SSE auto-reconnects
      };

      return eventSource;
    } catch (e) {
      console.log('SSE notification fallback:', e);
      return null;
    }
  }
}

// Attach globally for browser pages
window.EcoFruitAPI = ApiClient;
