/**
 * GreenFruit Eco - AI Customer Service Chatbot
 * Hỗ trợ tư vấn dinh dưỡng hoa quả sạch, tiểu đường, giảm cân, mẹ bầu, giỏ quà biếu, theo mùa vụ.
 * Tích hợp hệ thống đa tầng:
 * 1. Google Gemini AI / Groq AI (Trực tiếp từ backend hoặc API Key người dùng)
 * 2. High-IQ Domain Knowledge Engine (Grounded thực tế với dữ liệu kho hoa quả EcoFruit)
 * 3. Thẻ sản phẩm trực quan tương tác (Xem chi tiết + 1-Click Thêm vào giỏ)
 * 4. Nút bấm hành động lọc sản phẩm thông minh (Action Pills)
 */

class GreenFruitChatbot {
  constructor() {
    this.apiKey = localStorage.getItem(DB_KEYS.GEMINI_KEY) || '';
    this.isOpen = false;
    this.initUI();
    this.bindEvents();
  }

  initUI() {
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
                <li>🩺 Tư vấn hoa quả cho <strong>người tiểu đường, ăn kiêng, mẹ bầu</strong></li>
                <li>🍂 Gợi ý trái cây <strong>đúng mùa thu hoạch</strong> ngon ngọt nhất</li>
                <li>🎁 Tư vấn <strong>set giỏ quà biếu tặng sang trọng</strong></li>
                <li>✈️ Lựa chọn <strong>trái cây nhập khẩu cao cấp</strong></li>
                <li>🛡️ Tra cứu đơn hàng & chính sách bảo hành bao ăn 1 đổi 1</li>
              </ul>
            </div>
          </div>

          <!-- Quick Prompts Suggestions -->
          <div class="chatbot-quick-prompts" id="chatbot-quick-prompts">
            <button class="quick-prompt-btn" data-query="Hoa quả nào tốt cho người tiểu đường?">🩺 Tiểu đường nên ăn gì?</button>
            <button class="quick-prompt-btn" data-query="Tư vấn hoa quả giảm cân giữ dáng">🥗 Hoa quả giảm cân</button>
            <button class="quick-prompt-btn" data-query="Mùa này nên ăn trái cây gì ngon nhất?">🍂 Trái cây đúng mùa vụ</button>
            <button class="quick-prompt-btn" data-query="Tư vấn giỏ quà biếu tặng đối tác">🎁 Giỏ quà biếu VIP</button>
            <button class="quick-prompt-btn" data-query="Top hoa quả nhập khẩu cao cấp">✈️ Hoa quả nhập khẩu</button>
          </div>

          <!-- Input Footer -->
          <form class="chatbot-footer" id="chatbot-input-form">
            <input type="text" id="chatbot-input-text" placeholder="Hỏi về tiểu đường, giỏ quà, nhập khẩu, giá..." autocomplete="off" required>
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

    toggleBtn?.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      windowEl.classList.toggle('active', this.isOpen);
      if (this.isOpen) {
        input.focus();
      }
    });

    closeBtn?.addEventListener('click', () => {
      this.isOpen = false;
      windowEl.classList.remove('active');
    });

    settingsBtn?.addEventListener('click', () => {
      const currentKey = this.apiKey;
      const newKey = prompt('Nhập Google Gemini API Key miễn phí của bạn để kích hoạt AI tạo sinh cao cấp (Để trống để dùng AI chuyên gia tích hợp sẵn):', currentKey);
      if (newKey !== null) {
        this.apiKey = newKey.trim();
        localStorage.setItem(DB_KEYS.GEMINI_KEY, this.apiKey);
        showToast('Cài đặt AI', this.apiKey ? 'Đã kích hoạt Google Gemini API thành công!' : 'Đang sử dụng AI chuyên gia tích hợp sẵn.', 'info');
      }
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.handleUserMessage(text);
      input.value = '';
    });

    quickPromptContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-prompt-btn');
      if (btn) {
        const query = btn.dataset.query;
        this.handleUserMessage(query);
      }
    });
  }

  appendMessage(sender, textHTML, suggestedProducts = [], suggestedActions = []) {
    const body = document.getElementById('chatbot-msg-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}`;

    let fullHTML = textHTML;

    // Render interactive mini product cards if provided
    if (suggestedProducts && suggestedProducts.length > 0) {
      let cardsHTML = '<div class="chat-products-list">';
      suggestedProducts.forEach(p => {
        const pId = p.id;
        const pName = p.name;
        const pPrice = formatCurrency(p.price);
        const pUnit = (p.unit || 'kg').split('(')[0].trim();
        const pImg = p.image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=150&q=80';

        cardsHTML += `
          <div class="chat-product-item">
            <img src="${pImg}" alt="${pName}" class="chat-product-thumb" loading="lazy">
            <div class="chat-product-info">
              <div class="chat-product-name" title="${pName}">${pName}</div>
              <div class="chat-product-price">${pPrice} <small class="text-muted fw-normal">/${pUnit}</small></div>
            </div>
            <div class="chat-product-actions">
              <a href="product-detail.html?id=${pId}" class="btn-chat-view-detail" title="Xem chi tiết sản phẩm">
                <i class="fa-solid fa-eye"></i> Xem
              </a>
              <button class="btn-chat-add-cart" onclick="window.greenFruitChatbot.handleChatAddToCart('${pId}', '${pName}', event)" title="Thêm ngay vào giỏ hàng">
                <i class="fa-solid fa-cart-plus"></i>
              </button>
            </div>
          </div>
        `;
      });
      cardsHTML += '</div>';
      fullHTML += cardsHTML;
    }

    // Render interactive action pill buttons if provided
    if (suggestedActions && suggestedActions.length > 0) {
      let pillsHTML = '<div class="chat-action-pills">';
      suggestedActions.forEach(act => {
        pillsHTML += `
          <a href="${act.url}" class="chat-action-pill-btn">
            <i class="${act.icon || 'fa-solid fa-arrow-right'}"></i> ${act.label}
          </a>
        `;
      });
      pillsHTML += '</div>';
      fullHTML += pillsHTML;
    }

    msgDiv.innerHTML = fullHTML;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
    return msgDiv;
  }

  handleChatAddToCart(productId, productName, e) {
    if (e) e.preventDefault();
    addToCart(productId, 1);
    showToast('Đã thêm vào giỏ!', `Đã thêm 1 phần ${productName} vào giỏ hàng từ EcoBot.`, 'success');
  }

  showTypingIndicator() {
    return this.appendMessage('bot', `
      <div class="d-flex align-items-center gap-1 py-1">
        <div class="spinner-grow spinner-grow-sm text-success" style="width: 8px; height: 8px;" role="status"></div>
        <div class="spinner-grow spinner-grow-sm text-success" style="width: 8px; height: 8px; animation-delay: 0.15s;" role="status"></div>
        <div class="spinner-grow spinner-grow-sm text-success" style="width: 8px; height: 8px; animation-delay: 0.3s;" role="status"></div>
        <small class="text-muted ms-2">EcoBot đang phân tích dinh dưỡng...</small>
      </div>
    `);
  }

  async handleUserMessage(message) {
    this.appendMessage('user', message);
    const typingIndicator = this.showTypingIndicator();

    try {
      let botReply = '';
      let suggestedProducts = [];
      let suggestedActions = [];

      // 1. Gửi lên Django AI Backend (tích hợp Gemini / Groq / Domain Knowledge RAG)
      if (window.EcoFruitAPI) {
        try {
          const res = await window.EcoFruitAPI.askAI(message);
          if (res && res.data) {
            if (res.data.reply) {
              botReply = res.data.reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
            }
            suggestedProducts = res.data.suggested_products || [];
            suggestedActions = res.data.suggested_actions || [];
          }
        } catch (apiErr) {
          console.log('[EcoFruit AI] Local backend AI fallback:', apiErr.message);
        }
      }

      // 2. Client-side Fallback nếu backend không phản hồi
      if (!botReply) {
        if (this.apiKey) {
          botReply = await this.callGeminiAPI(message);
        } else {
          await new Promise(r => setTimeout(r, 400));
          const offlineData = this.generateSmartOfflineResponse(message);
          botReply = offlineData.reply;
          suggestedProducts = offlineData.products;
          suggestedActions = offlineData.actions;
        }
      }

      typingIndicator.remove();
      this.appendMessage('bot', botReply, suggestedProducts, suggestedActions);
    } catch (err) {
      typingIndicator.remove();
      const fallbackData = this.generateSmartOfflineResponse(message);
      this.appendMessage('bot', fallbackData.reply, fallbackData.products, fallbackData.actions);
    }
  }

  // Gọi API Google Gemini Client-Side nếu người dùng nhập Key riêng
  async callGeminiAPI(userQuery) {
    const products = getProducts();
    const productListSummary = products.map(p => `- ${p.name} (Giá: ${formatCurrency(p.price)}/${p.unit}, Mùa: ${p.seasonName}, Chứng nhận: ${p.cert})`).join('\n');

    const systemPrompt = `Bạn là EcoBot - chuyên gia dinh dưỡng và tư vấn hoa quả sạch của GreenFruit Eco.
Hãy trả lời thân thiện, lịch sự, chuẩn xác, giàu kiến thức dinh dưỡng bằng tiếng Việt.
Danh sách sản phẩm hiện có:
${productListSummary}`;

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
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  // Bộ Não AI Offline Thông Minh Client-Side
  generateSmartOfflineResponse(input) {
    const query = input.toLowerCase().trim();
    const products = getProducts();
    let reply = '';
    let suggestedProducts = [];
    let suggestedActions = [];

    // 1. Tiểu đường / Đường huyết
    if (query.includes('tiểu đường') || query.includes('đường huyết') || query.includes('gi thấp') || query.includes('insulin')) {
      reply = `🩺 <strong>Tư vấn hoa quả cho người kiểm soát đường huyết:</strong><br>
      Người có đường huyết cao nên chọn các loại hoa quả có <strong>chỉ số đường huyết (GI) thấp (&lt; 55)</strong> và giàu chất xơ hòa tan:<br>
      <ul class="mb-2 ps-3 mt-1">
        <li><strong>Bưởi da xanh Bến Tre:</strong> Enzyme naringenin tự nhiên hỗ trợ điều hòa insulin và đốt mỡ thừa.</li>
        <li><strong>Bơ sáp 034 Đắk Lắk:</strong> Không làm tăng đường huyết, giàu chất béo đơn không bão hòa tốt cho tim mạch.</li>
        <li><strong>Kiwi Vàng Zespri:</strong> Chỉ số GI thấp, giàu Vitamin C và chất xơ làm chậm hấp thụ đường.</li>
        <li><strong>Táo Envy New Zealand:</strong> Giàu chất xơ Pectin no lâu, giảm cảm giác thèm ngọt.</li>
      </ul>
      ⚠️ <em>Lời khuyên:</em> Nên ăn cả múi/quả tươi (không ép lấy nước bỏ bã), ăn cách bữa chính 1.5 - 2 tiếng nhé!`;

      suggestedProducts = products.filter(p => ['sp-06', 'sp-05', 'sp-09', 'sp-04'].includes(String(p.id)) || p.name.includes('Bưởi') || p.name.includes('Bơ') || p.name.includes('Táo') || p.name.includes('Kiwi')).slice(0, 4);
      suggestedActions = [
        { label: '🩺 Xem danh sách quả cho người tiểu đường', url: 'products.html?health=tieu-duong', icon: 'fa-solid fa-heart-pulse' },
        { label: '🥑 Xem Bơ Sáp 034', url: 'product-detail.html?id=sp-05', icon: 'fa-solid fa-apple-whole' },
        { label: '🍊 Xem Bưởi Da Xanh', url: 'product-detail.html?id=sp-06', icon: 'fa-solid fa-leaf' }
      ];
      return { reply, products: suggestedProducts, actions: suggestedActions };
    }

    // 2. Giảm cân / Ăn kiêng / Calo
    if (query.includes('giảm cân') || query.includes('diet') || query.includes('eat clean') || query.includes('keto') || query.includes('calo')) {
      reply = `🥗 <strong>Gợi ý hoa quả giảm cân & giữ dáng hiệu quả:</strong><br>
      <ul class="mb-2 ps-3 mt-1">
        <li><strong>Bưởi da xanh:</strong> Lượng calo cực thấp, giàu enzyme đốt mỡ và thanh lọc cơ thể.</li>
        <li><strong>Táo Envy / Táo xanh:</strong> Giàu chất xơ Pectin, tạo cảm giác no lâu, chống thèm ăn vặt.</li>
        <li><strong>Dâu tây Mộc Châu & Kiwi:</strong> Giàu chất chống oxy hóa, hỗ trợ chuyển hóa năng lượng nhanh.</li>
      </ul>
      💡 Nhập mã <strong>ECO10</strong> để được giảm 10% đơn hàng bạn nhé!`;

      suggestedProducts = products.filter(p => ['sp-06', 'sp-04', 'sp-03', 'sp-09'].includes(String(p.id)) || p.name.includes('Bưởi') || p.name.includes('Dâu') || p.name.includes('Táo')).slice(0, 4);
      suggestedActions = [
        { label: '🥗 Xem hoa quả ăn kiêng & giảm cân', url: 'products.html?health=giam-can', icon: 'fa-solid fa-fire' }
      ];
      return { reply, products: suggestedProducts, actions: suggestedActions };
    }

    // 3. Giỏ quà / Quà tặng
    if (query.includes('quà') || query.includes('biếu') || query.includes('hộp quà') || query.includes('tặng')) {
      reply = `🎁 <strong>Gợi ý Giỏ Quà & Hộp Quà Biếu Tặng Sang Trọng:</strong><br>
      GreenFruit Eco cung cấp các dòng quà tặng trái cây cao cấp bọc hoa lụa nghệ thuật:<br>
      <ul class="mb-2 ps-3 mt-1">
        <li><strong>Hộp Quà Eco VIP Phú Quý:</strong> Kết hợp Nho Mẫu Đơn Nhật, Táo Envy Size L và Cherry đỏ Mỹ.</li>
        <li><strong>Giỏ Quà Đại Cát Đại Lợi:</strong> Đóng gói sang trọng kèm thiệp thiết kế riêng theo yêu cầu.</li>
      </ul>
      🚚 Tặng kèm thiệp chúc mừng, giao hỏa tốc 2 giờ nội thành bảo quản lạnh! Áp mã <strong>VIP20</strong> giảm 20% nhé!`;

      suggestedProducts = products.filter(p => p.category === 'hop-qua' || ['sp-10', 'sp-02', 'sp-07', 'sp-04'].includes(String(p.id))).slice(0, 4);
      suggestedActions = [
        { label: '🎁 Xem bộ sưu tập Giỏ Quà Biếu VIP', url: 'products.html?category=hop-qua', icon: 'fa-solid fa-gift' },
        { label: '🍇 Xem Nho Mẫu Đơn Nhật', url: 'product-detail.html?id=sp-02', icon: 'fa-solid fa-crown' }
      ];
      return { reply, products: suggestedProducts, actions: suggestedActions };
    }

    // 4. Mùa vụ / Đúng mùa / Trái mùa
    if (query.includes('mùa') || query.includes('đúng vụ') || query.includes('trái mùa') || query.includes('tháng')) {
      reply = `🍂 <strong>Hoa quả vào chính vụ thu hoạch rộ & Trái mùa tuyển chọn:</strong><br>
      - <strong>Đúng mùa vụ:</strong> Sầu riêng Ri6, Bưởi da xanh, Cam sành (độ ngọt tự nhiên cao nhất, giá tốt nhất).<br>
      - <strong>Trái mùa công nghệ cao:</strong> Dâu tây nhà kính Mộc Châu, Nho mẫu đơn Nhật, Cherry Mỹ nhập khẩu.`;

      suggestedProducts = products.filter(p => p.season === 'dung-mua' || ['sp-01', 'sp-06', 'sp-08'].includes(String(p.id))).slice(0, 4);
      suggestedActions = [
        { label: '🍂 Xem hoa quả Đúng Mùa Thu Hoạch', url: 'products.html?season=dung-mua', icon: 'fa-solid fa-leaf' },
        { label: '🌿 Xem hoa quả Trái Mùa Tuyển Chọn', url: 'products.html?season=trai-mua', icon: 'fa-solid fa-seedling' }
      ];
      return { reply, products: suggestedProducts, actions: suggestedActions };
    }

    // 5. Hoa quả nhập khẩu
    if (query.includes('nhập khẩu') || query.includes('nhap khau') || query.includes('ngoại')) {
      reply = `✈️ <strong>Trái cây nhập khẩu bay trực tiếp tươi ngon:</strong><br>
      Toàn bộ được nhập khẩu chính ngạch đường hàng không, cuống xanh mọng nước, đạt chuẩn GlobalGAP và bảo quản kho lạnh 0 - 4°C.`;

      suggestedProducts = products.filter(p => p.category === 'nhap-khau' || ['sp-02', 'sp-07', 'sp-09', 'sp-04'].includes(String(p.id))).slice(0, 4);
      suggestedActions = [
        { label: '✈️ Xem toàn bộ Trái Cây Nhập Khẩu', url: 'products.html?category=nhap-khau', icon: 'fa-solid fa-plane-arrival' }
      ];
      return { reply, products: suggestedProducts, actions: suggestedActions };
    }

    // Default Fallback
    reply = `Dạ chào quý khách! EcoBot có thể hỗ trợ quý khách tìm loại hoa quả tươi ngon nào hôm nay ạ? Quý khách có thể xem nhanh qua các nút gợi ý bên dưới nhé!`;
    suggestedProducts = products.slice(0, 3);
    suggestedActions = [
      { label: '🩺 Hoa quả cho người tiểu đường', url: 'products.html?health=tieu-duong', icon: 'fa-solid fa-heart-pulse' },
      { label: '🎁 Giỏ quà biếu sang trọng', url: 'products.html?category=hop-qua', icon: 'fa-solid fa-gift' },
      { label: '✈️ Trái cây nhập khẩu', url: 'products.html?category=nhap-khau', icon: 'fa-solid fa-plane-arrival' }
    ];
    return { reply, products: suggestedProducts, actions: suggestedActions };
  }
}

// Khởi tạo Chatbot toàn cục khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.greenFruitChatbot = new GreenFruitChatbot();
});
