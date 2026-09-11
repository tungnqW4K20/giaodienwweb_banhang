/**
 * GreenFruit Eco - AI Customer Service Chatbot
 * Hỗ trợ tư vấn dinh dưỡng hoa quả sạch, theo mùa vụ, gợi ý quà tặng, tra cứu đơn hàng.
 * Tích hợp 2 chế độ:
 * 1. Google Gemini API (Người dùng nhập API Key miễn phí từ Google AI Studio)
 * 2. Smart Offline Rule-Based AI Engine (Tự động kích hoạt thông minh, độ chính xác cao)
 */

class GreenFruitChatbot {
  constructor() {
    this.apiKey = localStorage.getItem(DB_KEYS.GEMINI_KEY) || '';
    this.isOpen = false;
    this.initUI();
    this.bindEvents();
  }

  initUI() {
    // Nếu widget đã có thì không chèn thêm
    if (document.getElementById('gf-chatbot-container')) return;

    const chatbotHTML = `
      <div id="gf-chatbot-container">
        <!-- Floating Button -->
        <button class="chatbot-float-btn" id="btn-chatbot-toggle" title="Trò chuyện với Trợ lý AI GreenFruit">
          <div class="pulse-ring"></div>
          <i class="fa-solid fa-robot"></i>
        </button>

        <!-- Chat Window -->
        <div class="chatbot-window" id="gf-chatbot-window">
          <!-- Header -->
          <div class="chatbot-header">
            <div class="bot-info">
              <div class="bot-avatar">
                <i class="fa-solid fa-seedling"></i>
              </div>
              <div>
                <strong class="d-block text-white" style="font-size: 15px;">EcoBot AI - Tư Vấn Trái Cây</strong>
                <small class="text-white-50" style="font-size: 11px;">
                  <i class="fa-solid fa-circle text-success me-1" style="font-size: 8px;"></i>
                  ${this.apiKey ? 'Chế độ Gemini AI Live' : 'Chế độ Trợ Lý Chuyên Gia'}
                </small>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-light p-1" id="btn-chatbot-settings" title="Cài đặt API Key Gemini">
                <i class="fa-solid fa-gear"></i>
              </button>
              <button class="btn btn-sm btn-outline-light p-1" id="btn-chatbot-close">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Body Message Stream -->
          <div class="chatbot-body" id="chatbot-msg-body">
            <div class="chat-msg bot">
              Xin chào quý khách! 👋 Tôi là <strong>EcoBot</strong> - Trợ lý AI chuyên gia về hoa quả sạch và dinh dưỡng của <strong>GreenFruit Eco</strong>.<br><br>
              Tôi có thể giúp quý khách:
              <ul class="mb-0 ps-3 mt-1 small">
                <li>Tư vấn hoa quả theo mùa vụ ngọt ngon nhất</li>
                <li>Lựa chọn trái cây cho người tiểu đường, ăn kiêng, mẹ bầu</li>
                <li>Gợi ý giỏ quà biếu tặng sang trọng</li>
                <li>Tra cứu tình trạng đơn hàng & chính sách đổi trả</li>
              </ul>
            </div>
          </div>

          <!-- Quick Prompts Suggestions -->
          <div class="chatbot-quick-prompts" id="chatbot-quick-prompts">
            <button class="quick-prompt-btn" data-query="Hoa quả nào tốt cho người tiểu đường?">🍎 Tiểu đường nên ăn gì?</button>
            <button class="quick-prompt-btn" data-query="Mùa này nên ăn trái cây gì ngon nhất?">🍂 Trái cây đúng mùa vụ</button>
            <button class="quick-prompt-btn" data-query="Tư vấn giỏ quà biếu tặng đối tác">🎁 Tư vấn giỏ quà biếu</button>
            <button class="quick-prompt-btn" data-query="Chính sách bảo hành và đổi trả thế nào?">🛡️ Chính sách đổi trả</button>
          </div>

          <!-- Input Footer -->
          <form class="chatbot-footer" id="chatbot-input-form">
            <input type="text" id="chatbot-input-text" placeholder="Hỏi về hoa quả, dinh dưỡng, đơn hàng..." autocomplete="off" required>
            <button type="submit" title="Gửi tin nhắn">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = chatbotHTML;
    document.body.appendChild(container);
  }

  bindEvents() {
    const toggleBtn = document.getElementById('btn-chatbot-toggle');
    const closeBtn = document.getElementById('btn-chatbot-close');
    const settingsBtn = document.getElementById('btn-chatbot-settings');
    const windowEl = document.getElementById('gf-chatbot-window');
    const form = document.getElementById('chatbot-input-form');
    const input = document.getElementById('chatbot-input-text');
    const quickPromptContainer = document.getElementById('chatbot-quick-prompts');

    toggleBtn.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      windowEl.classList.toggle('active', this.isOpen);
      if (this.isOpen) {
        input.focus();
      }
    });

    closeBtn.addEventListener('click', () => {
      this.isOpen = false;
      windowEl.classList.remove('active');
    });

    settingsBtn.addEventListener('click', () => {
      const currentKey = this.apiKey;
      const newKey = prompt('Nhập Google Gemini API Key miễn phí của bạn để kích hoạt AI tạo sinh cao cấp (Để trống để dùng AI chuyên gia tích hợp sẵn):', currentKey);
      if (newKey !== null) {
        this.apiKey = newKey.trim();
        localStorage.setItem(DB_KEYS.GEMINI_KEY, this.apiKey);
        showToast('Cài đặt AI', this.apiKey ? 'Đã kích hoạt Google Gemini API thành công!' : 'Đang sử dụng AI chuyên gia tích hợp sẵn.', 'info');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.handleUserMessage(text);
      input.value = '';
    });

    quickPromptContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-prompt-btn');
      if (btn) {
        const query = btn.dataset.query;
        this.handleUserMessage(query);
      }
    });
  }

  appendMessage(sender, textHTML) {
    const body = document.getElementById('chatbot-msg-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}`;
    msgDiv.innerHTML = textHTML;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
    return msgDiv;
  }

  showTypingIndicator() {
    return this.appendMessage('bot', `
      <div class="d-flex align-items-center gap-1 py-1">
        <div class="spinner-grow spinner-grow-sm text-success" style="width: 8px; height: 8px;" role="status"></div>
        <div class="spinner-grow spinner-grow-sm text-success" style="width: 8px; height: 8px; animation-delay: 0.15s;" role="status"></div>
        <div class="spinner-grow spinner-grow-sm text-success" style="width: 8px; height: 8px; animation-delay: 0.3s;" role="status"></div>
        <small class="text-muted ms-2">EcoBot đang suy nghĩ...</small>
      </div>
    `);
  }

  async handleUserMessage(message) {
    this.appendMessage('user', message);
    const typingIndicator = this.showTypingIndicator();

    try {
      let botReply = '';
      if (this.apiKey) {
        botReply = await this.callGeminiAPI(message);
      } else {
        // Trì hoãn 500ms giả lập suy nghĩ
        await new Promise(r => setTimeout(r, 600));
        botReply = this.generateSmartOfflineResponse(message);
      }
      typingIndicator.remove();
      this.appendMessage('bot', botReply);
    } catch (err) {
      typingIndicator.remove();
      const fallbackReply = this.generateSmartOfflineResponse(message);
      this.appendMessage('bot', fallbackReply);
    }
  }

  // Gọi API Google Gemini
  async callGeminiAPI(userQuery) {
    const products = getProducts();
    const productListSummary = products.map(p => `- ${p.name} (${p.categoryName}, Mùa: ${p.seasonName}, Giá: ${formatCurrency(p.price)}/${p.unit}, Chứng nhận: ${p.cert})`).join('\n');

    const systemPrompt = `Bạn là EcoBot - chuyên gia dinh dưỡng và tư vấn bán hàng của GreenFruit Eco (website hoa quả sạch hữu cơ VietGAP/GlobalGAP cao cấp).
Hãy trả lời thân thiện, lịch sự, chuẩn xác, giàu kiến thức dinh dưỡng bằng tiếng Việt.
Danh sách sản phẩm hiện có tại cửa hàng:
${productListSummary}
Nếu khách hỏi về hoa quả theo mùa, hãy phân tích quả đúng mùa (ngon, rẻ) và trái mùa. Nếu khách hỏi mã đơn hoặc chính sách, hãy nêu chính sách bao đổi trả 24h, miễn phí ship từ 500k, hotline 1900 6868.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nKhách hàng hỏi: ${userQuery}` }] }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Gemini API Error');
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.replace(/\n/g, '<br>');
  }

  // Bộ Não AI Offline Thông Minh
  generateSmartOfflineResponse(input) {
    const query = input.toLowerCase().trim();
    const products = getProducts();

    // 1. Kiểm tra tra cứu đơn hàng
    if (query.includes('đơn hàng') || query.includes('gf-') || query.includes('tra cứu')) {
      const match = query.match(/gf-\d+/i);
      if (match) {
        const orderId = match[0].toUpperCase();
        const orders = getOrders();
        const found = orders.find(o => o.id.toUpperCase() === orderId);
        if (found) {
          return `📦 <strong>Thông tin đơn hàng ${found.id}:</strong><br>
          - <strong>Trạng thái:</strong> <span class="badge ${found.badgeColor}">${found.statusText}</span><br>
          - <strong>Ngày đặt:</strong> ${found.date}<br>
          - <strong>Tổng thanh toán:</strong> ${formatCurrency(found.total)} (${found.paymentStatus})<br>
          - <strong>Mã vận đơn:</strong> <code>${found.trackingCode}</code><br>
          - <strong>Địa chỉ giao:</strong> ${found.shippingAddress}`;
        } else {
          return `Rất tiếc, EcoBot chưa tìm thấy mã đơn <strong>${orderId}</strong> trong hệ thống. Quý khách vui lòng kiểm tra lại mã hoặc xem tại <a href="profile.html#orders" class="text-primary fw-bold">Lịch sử đơn hàng</a>.`;
        }
      }
      return `Để tra cứu đơn hàng, quý khách vui lòng nhập mã đơn (ví dụ: <code>GF-982145</code>) hoặc truy cập trực tiếp <a href="profile.html#orders" class="text-primary fw-bold">Trang cá nhân > Lịch sử đơn hàng</a> nhé!`;
    }

    // 2. Tư vấn tiểu đường / người giảm cân / ăn kiêng
    if (query.includes('tiểu đường') || query.includes('đường huyết') || query.includes('giảm cân') || query.includes('eat clean') || query.includes('keto')) {
      return `🌿 <strong>Tư vấn dinh dưỡng cho người kiểm soát đường huyết & giảm cân:</strong><br>
      Các loại trái cây có chỉ số đường huyết thấp (GI thấp) và giàu chất xơ tại GreenFruit Eco gồm:
      <ul class="mb-2 ps-3 mt-1">
        <li><strong>Bưởi da xanh Bến Tre:</strong> Chứa enzyme naringenin giúp đốt cháy mỡ thừa và ổn định insulin.</li>
        <li><strong>Táo Envy New Zealand:</strong> Giàu chất xơ hòa tan Pectin, no lâu.</li>
        <li><strong>Việt Quất Hữu Cơ & Kiwi Vàng:</strong> Cực giàu chất chống oxy hóa, ít đường, nhiều Vitamin C.</li>
        <li><strong>Bơ sáp 034:</strong> Chất béo không bão hòa đơn tốt cho tim mạch, không làm tăng đường huyết.</li>
      </ul>
      👉 <a href="products.html" class="btn btn-sm btn-outline-gf mt-1 py-1">Xem các loại quả này ngay</a>`;
    }

    // 3. Tư vấn trái cây theo mùa vụ (Đúng mùa / Trái mùa)
    if (query.includes('mùa') || query.includes('đúng vụ') || query.includes('trái mùa') || query.includes('tháng')) {
      const inSeasonProducts = products.filter(p => p.season === 'dung-mua').slice(0, 4);
      const listInSeason = inSeasonProducts.map(p => `<li><strong>${p.name}</strong> (${formatCurrency(p.price)}/${p.unit}) - <em>${p.origin}</em></li>`).join('');

      return `🍂 <strong>Hoa quả đang vào chính vụ thu hoạch rộ (Ngon & Giá tốt nhất):</strong><br>
      <ul class="mb-2 ps-3 mt-1">
        ${listInSeason}
      </ul>
      ✨ <em>Mẹo mua sắm:</em> Hoa quả đúng vụ luôn tích lũy độ ngọt tự nhiên cao nhất, ít sâu bệnh và đạt chứng nhận VietGAP an toàn tuyệt đối.
      <br><a href="products.html?season=dung-mua" class="btn btn-sm btn-primary-gf mt-2 py-1">Lọc sản phẩm Đúng Mùa</a>`;
    }

    // 4. Tư vấn giỏ quà biếu tặng
    if (query.includes('quà') || query.includes('biếu') || query.includes('hộp quà') || query.includes('tặng')) {
      return `🎁 <strong>Gợi ý Giỏ quà / Hộp quà biếu tặng sang trọng:</strong><br>
      GreenFruit Eco cung cấp các dòng quà tặng trái cây cao cấp bọc hoa lụa nghệ thuật:
      <ul class="mb-2 ps-3 mt-1">
        <li><strong>Giỏ Quà VIP "Phú Quý Bình An" (1.250.000đ):</strong> Kết hợp Nho Mẫu Đơn Nhật, Táo Envy, Cherry đỏ Mỹ.</li>
        <li><strong>Hộp Quà Eco Box "Sức Khỏe Vàng" (850.000đ):</strong> Thiết kế nắp kính tinh tế, nơ lụa trang nhã.</li>
      </ul>
      🚚 <em>Ưu đãi:</em> Tặng kèm thiệp chúc mừng thiết kế riêng, giao hỏa tốc 2h nội thành bảo quản lạnh!<br>
      👉 <a href="products.html?category=hop-qua" class="btn btn-sm btn-primary-gf mt-1 py-1">Xem bộ sưu tập Giỏ Quà</a>`;
    }

    // 5. Chính sách đổi trả & Giao hàng
    if (query.includes('đổi trả') || query.includes('bảo hành') || query.includes('hỏng') || query.includes('dập') || query.includes('ship') || query.includes('giao hàng')) {
      return `🛡️ <strong>Chính sách cam kết & bảo hành 100% tại GreenFruit Eco:</strong><br>
      - <strong>Bao ăn 1 đổi 1 trong 24h:</strong> Nếu quả bị dập nát do vận chuyển, sượng hoặc sâu hỏng bên trong, cửa hàng hoàn tiền hoặc đổi mới ngay không thu thêm phí.<br>
      - <strong>Giao hàng:</strong> Miễn phí vận chuyển cho đơn từ 500.000đ (hoặc áp mã <code>FREESHIP</code>). Giao nhanh 2h trong nội thành bằng thùng xốp cách nhiệt.<br>
      - <strong>Hotline khiếu nại:</strong> 1900 6868 (8:00 - 21:00 hàng ngày).`;
    }

    // 6. Tìm kiếm sản phẩm cụ thể
    for (const p of products) {
      const cleanProductName = p.name.toLowerCase();
      const firstWord = cleanProductName.split(' ')[0];
      if (query.includes(cleanProductName) || (firstWord.length > 2 && query.includes(firstWord))) {
        return `🍎 <strong>${p.name}</strong><br>
        - <strong>Xuất xứ:</strong> ${p.origin}<br>
        - <strong>Tiêu chuẩn:</strong> ${p.cert} | Độ ngọt: ${p.brix}<br>
        - <strong>Giá bán:</strong> <span class="text-danger fw-bold">${formatCurrency(p.price)}/${p.unit}</span><br>
        - <strong>Mô tả:</strong> ${p.shortDesc}<br>
        👉 <a href="product-detail.html?id=${p.id}" class="btn btn-sm btn-primary-gf mt-2 py-1">Xem chi tiết sản phẩm</a>`;
      }
    }

    // 7. Câu chào hoặc câu hỏi chung
    if (query.includes('chào') || query.includes('hi') || query.includes('hello') || query.includes('alo')) {
      return `Dạ chào quý khách! EcoBot có thể hỗ trợ quý khách tìm loại trái cây tươi ngon nào hôm nay ạ? Quý khách có thể hỏi về giá cả, độ ngọt Brix, hoa quả cho mẹ bầu, người tập gym hay tư vấn giỏ quà biếu nhé!`;
    }

    // Default Fallback
    return `Cảm ơn câu hỏi của quý khách! Quý khách có thể xem toàn bộ các loại hoa quả tươi mới hái tại <a href="products.html" class="text-primary fw-bold">Danh mục sản phẩm</a> hoặc gọi hotline <strong>1900 6868</strong> để được hỗ trợ tức thì. Quý khách cũng có thể bấm biểu tượng ⚙️ góc trên để cài đặt <strong>Gemini API Key</strong> giúp EcoBot giải đáp chuyên sâu hơn nhé!`;
  }
}

// Khởi tạo Chatbot toàn cục khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.greenFruitChatbot = new GreenFruitChatbot();
});
