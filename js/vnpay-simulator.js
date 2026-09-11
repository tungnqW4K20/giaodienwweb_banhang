/**
 * GreenFruit Eco - VNPay Sandbox Payment Gateway Simulator
 * Mô phỏng trải nghiệm thanh toán cổng VNPAY Sandbox chuẩn xác với mã QR, Thẻ ATM nội địa, Thẻ quốc tế và xác thực OTP test.
 */

class VNPaySimulator {
  constructor() {
    this.modal = null;
    this.currentOrder = null;
    this.onSuccessCallback = null;
    this.onCancelCallback = null;
    this.initModal();
  }

  initModal() {
    if (document.getElementById('vnpay-modal-container')) return;

    const modalHTML = `
      <div class="modal fade" id="vnpay-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <!-- VNPay Header -->
            <div class="p-3 text-white d-flex align-items-center justify-content-between" style="background: linear-gradient(90deg, #005baa 0%, #e31b23 100%);">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-white px-2 py-1 rounded">
                  <strong style="color: #005baa; font-size: 16px; font-weight: 900;">VN</strong><strong style="color: #e31b23; font-size: 16px; font-weight: 900;">PAY</strong>
                </div>
                <span class="badge bg-warning text-dark fw-bold">SANDBOX ENVIRONMENT</span>
              </div>
              <button type="button" class="btn-close btn-close-white" id="vnpay-btn-close" aria-label="Close"></button>
            </div>

            <!-- Order info summary bar -->
            <div class="bg-light px-4 py-2 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <small class="text-muted d-block">Đơn vị chấp nhận thanh toán:</small>
                <strong class="text-dark">GREENFRUIT ECO - HOA QUẢ SẠCH</strong>
              </div>
              <div>
                <small class="text-muted d-block">Mã đơn hàng / Giao dịch:</small>
                <strong class="text-primary" id="vnpay-txn-ref">#GF-SANDBOX</strong>
              </div>
              <div>
                <small class="text-muted d-block">Số tiền thanh toán:</small>
                <strong class="text-danger fs-5 font-heading" id="vnpay-amount">0 đ</strong>
              </div>
            </div>

            <!-- Main Tab Payment Options -->
            <div class="modal-body p-4">
              <ul class="nav nav-pills nav-fill mb-3 gap-2" id="vnpayTabs" role="tablist">
                <li class="nav-item">
                  <button class="nav-link active rounded-3 py-2 fw-bold" id="tab-qr" data-bs-toggle="pill" data-bs-target="#content-qr" type="button">
                    <i class="fa-solid fa-qrcode me-1"></i> VNPAY-QR
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link rounded-3 py-2 fw-bold" id="tab-atm" data-bs-toggle="pill" data-bs-target="#content-atm" type="button">
                    <i class="fa-solid fa-credit-card me-1"></i> Thẻ ATM / Tài khoản
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link rounded-3 py-2 fw-bold" id="tab-intl" data-bs-toggle="pill" data-bs-target="#content-intl" type="button">
                    <i class="fa-brands fa-cc-visa me-1"></i> Thẻ Quốc Tế
                  </button>
                </li>
              </ul>

              <div class="tab-content pt-2" id="vnpayTabContent">
                <!-- TAB 1: QR CODE -->
                <div class="tab-pane fade show active text-center" id="content-qr" role="tabpanel">
                  <div class="card p-3 border-0 bg-light d-inline-block rounded-4 shadow-sm my-2">
                    <img id="vnpay-qr-image" src="" alt="VNPAY-QR Test" class="img-fluid rounded-3" style="max-width: 220px;">
                  </div>
                  <p class="text-muted small mb-2"><i class="fa-solid fa-mobile-screen-button text-primary me-1"></i> Quét mã bằng ứng dụng Ngân hàng hoặc Ví VNPAY</p>
                  <div class="alert alert-info py-2 small d-inline-block mb-3">
                    <i class="fa-solid fa-flask text-warning me-1"></i> <strong>Chế độ Test Sandbox:</strong> Bấm nút bên dưới để mô phỏng quét mã thành công ngay lập tức.
                  </div>
                  <div>
                    <button type="button" class="btn btn-success fw-bold px-4 py-2" id="btn-simulate-qr-success">
                      <i class="fa-solid fa-circle-check me-1"></i> Giả lập Quét mã & Thanh toán thành công
                    </button>
                  </div>
                </div>

                <!-- TAB 2: NỘI ĐỊA ATM -->
                <div class="tab-pane fade" id="content-atm" role="tabpanel">
                  <div class="alert alert-warning py-2 small mb-3">
                    <strong><i class="fa-solid fa-circle-info"></i> Thông tin thẻ Test NCB:</strong><br>
                    - Số thẻ: <code>9704198526191432152</code> | Tên: <code>NGUYEN VAN A</code> | Ngày: <code>07/15</code> | OTP: <code>123456</code>
                    <button class="btn btn-sm btn-outline-dark ms-2 py-0" id="btn-autofill-atm">Điền tự động</button>
                  </div>
                  
                  <form id="vnpay-atm-form">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label small fw-bold">Chọn Ngân hàng phát hành</label>
                        <select class="form-select" id="vnpay-bank-select">
                          <option value="NCB" selected>NCB - Ngân hàng Quốc Dân (Khuyên dùng Test)</option>
                          <option value="VCB">Vietcombank</option>
                          <option value="TCB">Techcombank</option>
                          <option value="MB">MBBank</option>
                          <option value="BIDV">BIDV</option>
                          <option value="CTG">VietinBank</option>
                        </select>
                      </div>
                      <div class="col-12">
                        <label class="form-label small fw-bold">Số thẻ ngân hàng</label>
                        <input type="text" class="form-control" id="vnpay-card-no" placeholder="9704 1985 2619 1432 152" required>
                      </div>
                      <div class="col-md-7">
                        <label class="form-label small fw-bold">Tên chủ thẻ (Không dấu)</label>
                        <input type="text" class="form-control text-uppercase" id="vnpay-card-holder" placeholder="NGUYEN VAN A" required>
                      </div>
                      <div class="col-md-5">
                        <label class="form-label small fw-bold">Ngày phát hành (MM/YY)</label>
                        <input type="text" class="form-control" id="vnpay-card-date" placeholder="07/15" required>
                      </div>
                      <div class="col-12 mt-3 text-end">
                        <button type="submit" class="btn btn-primary-gf w-100 py-2">
                          Tiếp tục xác thực OTP <i class="fa-solid fa-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  </form>

                  <!-- Step OTP Modal sub-view -->
                  <div id="vnpay-otp-step" class="d-none mt-3 text-center p-3 bg-light rounded-3">
                    <h6 class="fw-bold text-dark mb-2">Nhập mã xác thực OTP gửi về điện thoại</h6>
                    <p class="small text-muted mb-2">Mã OTP test mặc định là <strong>123456</strong></p>
                    <div class="d-flex justify-content-center gap-2 mb-3">
                      <input type="text" class="form-control text-center fs-4 fw-bold" id="vnpay-otp-input" maxlength="6" style="max-width: 180px; letter-spacing: 4px;" placeholder="123456">
                    </div>
                    <button type="button" class="btn btn-success fw-bold px-4" id="btn-confirm-otp">
                      <i class="fa-solid fa-lock me-1"></i> Xác nhận thanh toán
                    </button>
                  </div>
                </div>

                <!-- TAB 3: THẺ QUỐC TẾ -->
                <div class="tab-pane fade" id="content-intl" role="tabpanel">
                  <div class="alert alert-secondary py-2 small mb-3">
                    Hỗ trợ thẻ Visa, MasterCard, JCB thử nghiệm môi trường sandbox.
                  </div>
                  <form id="vnpay-intl-form">
                    <div class="mb-3">
                      <label class="form-label small fw-bold">Số thẻ Visa / Mastercard</label>
                      <input type="text" class="form-control" placeholder="4000 1234 5678 9010" value="4000 1234 5678 9010" required>
                    </div>
                    <div class="row g-3 mb-3">
                      <div class="col-6">
                        <label class="form-label small fw-bold">Hết hạn (MM/YY)</label>
                        <input type="text" class="form-control" placeholder="12/28" value="12/28" required>
                      </div>
                      <div class="col-6">
                        <label class="form-label small fw-bold">Mã bảo mật CVV</label>
                        <input type="password" class="form-control" placeholder="123" value="123" maxlength="3" required>
                      </div>
                    </div>
                    <button type="submit" class="btn btn-primary-gf w-100 py-2">
                      Thanh toán ngay <i class="fa-solid fa-check ms-1"></i>
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer bg-light py-2 d-flex justify-content-between">
              <small class="text-muted"><i class="fa-solid fa-shield-halved text-success"></i> Kết nối an toàn bảo mật 256-bit SSL</small>
              <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-cancel-vnpay">Hủy giao dịch</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'vnpay-modal-container';
    container.innerHTML = modalHTML;
    document.body.appendChild(container);

    this.bindEvents();
  }

  bindEvents() {
    const modalEl = document.getElementById('vnpay-modal');
    this.modal = new bootstrap.Modal(modalEl);

    // Cancel / Close buttons
    document.getElementById('vnpay-btn-close').addEventListener('click', () => this.cancelPayment());
    document.getElementById('btn-cancel-vnpay').addEventListener('click', () => this.cancelPayment());

    // QR simulate success
    document.getElementById('btn-simulate-qr-success').addEventListener('click', () => {
      this.completePayment('VNPAY_QR');
    });

    // Auto-fill test ATM Card
    document.getElementById('btn-autofill-atm').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('vnpay-card-no').value = '9704198526191432152';
      document.getElementById('vnpay-card-holder').value = 'NGUYEN VAN A';
      document.getElementById('vnpay-card-date').value = '07/15';
    });

    // ATM Form submit -> Show OTP
    document.getElementById('vnpay-atm-form').addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('vnpay-atm-form').classList.add('d-none');
      const otpStep = document.getElementById('vnpay-otp-step');
      otpStep.classList.remove('d-none');
      document.getElementById('vnpay-otp-input').value = '123456';
    });

    // OTP Confirm
    document.getElementById('btn-confirm-otp').addEventListener('click', () => {
      const otp = document.getElementById('vnpay-otp-input').value;
      if (otp === '123456' || otp.length === 6) {
        this.completePayment('VNPAY_ATM');
      } else {
        alert('Mã OTP không đúng! Vui lòng nhập mã test 123456');
      }
    });

    // Intl Form Submit
    document.getElementById('vnpay-intl-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.completePayment('VNPAY_INTL');
    });
  }

  openPayment({ orderId, amount, orderInfo, onSuccess, onCancel }) {
    this.currentOrder = { orderId, amount, orderInfo };
    this.onSuccessCallback = onSuccess;
    this.onCancelCallback = onCancel;

    // Reset UI
    document.getElementById('vnpay-txn-ref').textContent = orderId || `#GF-${Date.now().toString().slice(-6)}`;
    document.getElementById('vnpay-amount').textContent = formatCurrency(amount);
    
    // Generate dynamic QR code image via QuickChart / VietQR standard
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('VNPAY_SANDBOX_PAYMENT_GREENFRUIT_' + (orderId || 'TEST') + '_AMOUNT_' + amount)}`;
    document.getElementById('vnpay-qr-image').src = qrUrl;

    document.getElementById('vnpay-atm-form').classList.remove('d-none');
    document.getElementById('vnpay-otp-step').classList.add('d-none');

    this.modal.show();
  }

  completePayment(method) {
    const txnResponse = {
      vnp_ResponseCode: '00', // Thành công
      vnp_TransactionNo: 'VNP' + Date.now(),
      vnp_TxnRef: this.currentOrder.orderId,
      vnp_Amount: this.currentOrder.amount,
      vnp_BankCode: 'NCB',
      vnp_PayDate: new Date().toISOString(),
      vnp_OrderInfo: this.currentOrder.orderInfo || 'Thanh toan hoa qua GreenFruit Eco',
      method: method
    };

    this.modal.hide();

    if (this.onSuccessCallback) {
      this.onSuccessCallback(txnResponse);
    }
  }

  cancelPayment() {
    if (confirm('Bạn có chắc chắn muốn hủy giao dịch thanh toán qua VNPAY?')) {
      this.modal.hide();
      if (this.onCancelCallback) {
        this.onCancelCallback({
          vnp_ResponseCode: '24', // Khách hàng hủy giao dịch
          vnp_TxnRef: this.currentOrder ? this.currentOrder.orderId : null
        });
      }
    }
  }
}

// Global instance
window.vnpayGateway = new VNPaySimulator();
