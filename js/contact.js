/**
 * GreenFruit Eco - Contact Page Logic
 * Xử lý form gửi liên hệ, hỗ trợ giỏ quà doanh nghiệp và FAQ.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupContactForm();
});

function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const topic = document.getElementById('contact-topic').value;
    const message = document.getElementById('contact-message').value.trim();

    const feedback = {
      id: `FB-${Date.now()}`,
      name,
      phone,
      email,
      topic,
      message,
      date: new Date().toLocaleString('vi-VN')
    };

    // Lưu vào LocalStorage
    try {
      const allFeedback = JSON.parse(localStorage.getItem('gf_feedback')) || [];
      allFeedback.push(feedback);
      localStorage.setItem('gf_feedback', JSON.stringify(allFeedback));
    } catch (e) {}

    showToast('Gửi liên hệ thành công!', `Cảm ơn ${name}, chuyên viên CSKH GreenFruit Eco sẽ liên hệ lại qua số ${phone} trong vòng 30 phút!`, 'success');
    form.reset();
  });
}
