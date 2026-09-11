/**
 * GreenFruit Eco - Database & LocalStorage Manager
 * Quản lý toàn bộ cơ sở dữ liệu mẫu, danh mục, sản phẩm hoa quả sạch, mùa vụ, người dùng, đơn hàng và giỏ hàng.
 */

const DB_KEYS = {
  PRODUCTS: 'gf_products',
  CATEGORIES: 'gf_categories',
  CART: 'gf_cart',
  USERS: 'gf_users',
  CURRENT_USER: 'gf_current_user',
  ORDERS: 'gf_orders',
  VOUCHERS: 'gf_vouchers',
  REVIEWS: 'gf_reviews',
  VNPAY_WALLETS: 'gf_vnpay_wallets',
  GEMINI_KEY: 'gf_gemini_api_key'
};

// Dữ liệu đánh giá mẫu phong phú cho các sản phẩm
const DEFAULT_REVIEWS = {
  'sp-01': [ // Sầu riêng Ri6
    {
      id: 'rev-01',
      productId: 'sp-01',
      author: 'Trần Hoàng Mai',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      location: 'Hà Nội',
      rating: 5,
      date: '08/09/2026',
      verified: true,
      comment: 'Sầu riêng giao đến còn nguyên phấn, gai tươi xanh. Khui ra cơm vàng ươm, dẻo quánh béo ngậy đúng chuẩn Ri6 Chợ Lách. 10/10 điểm cho chất lượng và khâu đóng gói thùng xốp giữ lạnh!',
      likes: 24
    },
    {
      id: 'rev-02',
      productId: 'sp-01',
      author: 'Lê Minh Tuấn',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      location: 'TP. Hồ Chí Minh',
      rating: 5,
      date: '02/09/2026',
      verified: true,
      comment: 'Quả chín tự nhiên thơm nức mũi cả nhà, không hề bị sượng hay nhạt như mua ngoài chợ. Chính sách bao ăn 1 đổi 1 làm mình rất yên tâm khi đặt hàng.',
      likes: 18
    },
    {
      id: 'rev-03',
      productId: 'sp-01',
      author: 'Phạm Thị Bích Ngọc',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      location: 'Đà Nẵng',
      rating: 4,
      date: '28/08/2026',
      verified: true,
      comment: 'Cơm sầu béo ngọt đậm, hạt lép thật sự. Giao hàng nhanh, shipper nhiệt tình mang lên tận căn hộ.',
      likes: 9
    }
  ],
  'sp-02': [ // Nho Mẫu Đơn Shine Muscat
    {
      id: 'rev-04',
      productId: 'sp-02',
      author: 'Đỗ Kim Oanh',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      location: 'Hà Nội',
      rating: 5,
      date: '05/09/2026',
      verified: true,
      comment: 'Nho mẫu đơn chuẩn Okayama Nhật Bản, chùm to đều, trái đanh giòn sần sật, cắn vào ngập miệng thơm mùi hoa hồng xạ hương cực kỳ quý phái. Mua làm quà biếu đối tác ai cũng khen!',
      likes: 31
    },
    {
      id: 'rev-05',
      productId: 'sp-02',
      author: 'Nguyễn Thành Nam',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      location: 'TP. Hồ Chí Minh',
      rating: 5,
      date: '01/09/2026',
      verified: true,
      comment: 'Nho không hạt, vỏ mỏng dính ăn liền rất tiện. Đắt xắt ra miếng, chất lượng vượt trội.',
      likes: 14
    }
  ],
  'sp-03': [ // Dâu tây Mộc Châu
    {
      id: 'rev-06',
      productId: 'sp-03',
      author: 'Vũ Thu Trang',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
      location: 'Hải Phòng',
      rating: 5,
      date: '09/09/2026',
      verified: true,
      comment: 'Dâu tây đỏ mọng tươi rói, không bị dập nát một quả nào. Vị ngọt dịu chua thanh đặc trưng, bé nhà mình thích mê!',
      likes: 21
    }
  ],
  'sp-04': [ // Táo Envy
    {
      id: 'rev-07',
      productId: 'sp-04',
      author: 'Bùi Đức Hùng',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      location: 'TP. Hồ Chí Minh',
      rating: 5,
      date: '06/09/2026',
      verified: true,
      comment: 'Táo Envy giòn đanh, ngọt lịm mọng nước, để tủ lạnh ăn mát tê lưỡi. Gọt vỏ để lâu ngoài trời vẫn trắng tinh không bị thâm đen.',
      likes: 16
    }
  ]
};

// Dữ liệu danh mục hoa quả
const DEFAULT_CATEGORIES = [
  { id: 'tat-ca', name: 'Tất cả sản phẩm', icon: 'fa-solid fa-apple-whole', count: 18 },
  { id: 'noi-dia', name: 'Trái cây Nội địa', icon: 'fa-solid fa-leaf', count: 7 },
  { id: 'nhap-khau', name: 'Trái cây Nhập khẩu', icon: 'fa-solid fa-plane-departure', count: 6 },
  { id: 'hop-qua', name: 'Giỏ quà & Hộp quà VIP', icon: 'fa-solid fa-gift', count: 3 },
  { id: 'say-nuoc-ep', name: 'Trái cây sấy & Nước ép', icon: 'fa-solid fa-bottle-water', count: 2 }
];

// Danh mục mùa vụ
const SEASONS = {
  'dung-mua': { name: 'Đúng mùa thu hoạch (Rộ vụ - Ngon nhất)', badgeClass: 'badge-season-in' },
  'trai-mua': { name: 'Trái mùa (Nông nghiệp CNC)', badgeClass: 'badge-season-out' },
  'quanh-nam': { name: 'Quanh năm / Nhập khẩu', badgeClass: 'badge-season-all' }
};

// Dữ liệu sản phẩm mẫu phong phú
const DEFAULT_PRODUCTS = [
  {
    id: 'sp-01',
    name: 'Sầu riêng Ri6 Chín Cây Bến Tre',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 165000,
    originalPrice: 195000,
    unit: 'kg',
    origin: 'Chợ Lách, Bến Tre',
    cert: 'VietGAP',
    brix: '24° - 28° Brix (Ngọt béo đậm đà)',
    shelfLife: '3 - 5 ngày ở nhiệt độ phòng',
    rating: 5.0,
    reviewCount: 142,
    salesCount: 890,
    isFeatured: true,
    isFlashSale: true,
    stock: 45,
    images: [
      'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Sầu riêng Ri6 cơm vàng hạt lép, múi khô ráo, ngọt đậm béo ngậy, chín rụng tự nhiên không ngâm hóa chất.',
    fullDesc: `
      <p>Sầu riêng Ri6 tại <strong>GreenFruit Eco</strong> được tuyển chọn trực tiếp từ các nhà vườn đạt chuẩn <em>VietGAP</em> tại Chợ Lách, Bến Tre. Từng quả sầu riêng được để chín tự nhiên trên cây, thu hoạch khi đạt độ chín 8.5 - 9 tuổi để đảm bảo chất lượng ngon nhất.</p>
      <h5>Đặc điểm nổi bật:</h5>
      <ul>
        <li>Cơm vàng ươm, hạt lép trên 85%, thịt dẻo quánh, không nhão hay sượng nước.</li>
        <li>Hương thơm nồng nàn đặc trưng, vị ngọt đậm pha chút béo ngậy khó cưỡng.</li>
        <li>Cam kết 100% không nhúng thuốc chín ép, an toàn tuyệt đối cho sức khỏe cả gia đình.</li>
        <li>Chính sách bao ăn 1 đổi 1 trong vòng 24h nếu múi bị sượng hoặc nhạt.</li>
      </ul>
    `,
    nutrition: 'Giàu năng lượng, Vitamin C, Vitamin B6, Kali, Folate và chất xơ tự nhiên hỗ trợ tiêu hóa.'
  },
  {
    id: 'sp-02',
    name: 'Nho Mẫu Đơn Shine Muscat Nhật Bản',
    category: 'nhap-khau',
    categoryName: 'Trái cây Nhập khẩu',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 680000,
    originalPrice: 790000,
    unit: 'chùm (~750g)',
    origin: 'Okayama / Nagano, Nhật Bản',
    cert: 'GlobalGAP / Chuẩn JAS Nhật',
    brix: '18° - 22° Brix (Hương thơm hoa hồng)',
    shelfLife: '7 - 10 ngày trong ngăn mát tủ lạnh',
    rating: 4.9,
    reviewCount: 98,
    salesCount: 420,
    isFeatured: true,
    isFlashSale: false,
    stock: 20,
    images: [
      'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Nho Mẫu Đơn quả to tròn, vỏ xanh ngọc bóng bẩy, giòn tan không hạt, thơm mùi xạ hương quyến rũ.',
    fullDesc: `
      <p>Nho mẫu đơn (Shine Muscat) được mệnh danh là <em>"Nữ hoàng các loài nho"</em>, nhập khẩu trực tiếp bằng đường hàng không Cold-Chain giữ trọn vẹn phấn trắng tự nhiên và cuống xanh tươi rói.</p>
      <h5>Đặc điểm thưởng thức:</h5>
      <ul>
        <li>Vỏ cực mỏng, ăn liền không cần bóc vỏ, hoàn toàn không hạt.</li>
        <li>Thịt nho giòn sần sật, mọng nước, vị ngọt thanh tao kết hợp hương hoa quả và xạ hương nồng nàn.</li>
        <li>Sản phẩm thích hợp làm quà tặng ngoại giao, sinh nhật, thăm hỏi đối tác cao cấp.</li>
      </ul>
    `,
    nutrition: 'Chứa hàm lượng Resveratrol cao chống oxy hóa mạnh, Polyphenol bảo vệ tim mạch, Vitamin K.'
  },
  {
    id: 'sp-03',
    name: 'Dâu Tây Giống Nhật Mộc Châu Hữu Cơ',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 180000,
    originalPrice: 220000,
    unit: 'hộp 500g',
    origin: 'Cao nguyên Mộc Châu, Sơn La',
    cert: 'Hữu cơ Organic USDA',
    brix: '13° - 15° Brix (Ngọt dịu thơm lừng)',
    shelfLife: '3 - 4 ngày bảo quản lạnh 4°C',
    rating: 4.8,
    reviewCount: 215,
    salesCount: 1250,
    isFeatured: true,
    isFlashSale: true,
    stock: 60,
    images: [
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1587393855524-087f83d95bc9?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Dâu tây hữu cơ trồng nhà màng công nghệ cao, đỏ mọng tự nhiên, vị ngọt đậm đà xen chua dịu đặc trưng.',
    fullDesc: `
      <p>Dâu tây được trồng tại độ cao trên 1.050m tại cao nguyên Mộc Châu với khí hậu se lạnh quanh năm. Cây được tưới bằng nước khoáng ngầm tự nhiên, thụ phấn bằng ong mật và không sử dụng bất kỳ phân bón hóa học nào.</p>
      <h5>Ưu điểm vượt trội:</h5>
      <ul>
        <li>Trái to đều, màu đỏ ruby rực rỡ, bề mặt căng mọng bóng đẹp.</li>
        <li>Hương thơm nức mũi ngay khi mở hộp, ăn giòn mọng nước.</li>
        <li>Thu hái lúc sáng sớm và giao nhanh trong ngày về kho lạnh.</li>
      </ul>
    `,
    nutrition: 'Nguồn Vitamin C dồi dào, Axit Ellagic ngăn ngừa lão hóa, tăng cường hệ miễn dịch cho trẻ nhỏ và mẹ bầu.'
  },
  {
    id: 'sp-04',
    name: 'Táo Envy Size L Nhập Khẩu New Zealand',
    category: 'nhap-khau',
    categoryName: 'Trái cây Nhập khẩu',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 195000,
    originalPrice: 230000,
    unit: 'kg (khoảng 3 quả)',
    origin: 'Vịnh Hawke, New Zealand',
    cert: 'GlobalGAP',
    brix: '15° - 17° Brix',
    shelfLife: '2 - 3 tuần trong ngăn mát tủ lạnh',
    rating: 4.9,
    reviewCount: 310,
    salesCount: 2400,
    isFeatured: true,
    isFlashSale: false,
    stock: 120,
    images: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Táo Envy vỏ đỏ rượu vang xen sọc vàng, thịt trắng kem siêu giòn, nhiều nước, giữ màu trắng lâu khi cắt.',
    fullDesc: `
      <p>Táo Envy New Zealand là dòng táo cao cấp đứng đầu thế giới về độ giòn ngọt và mùi hương thơm mát. Táo được rửa sạch bằng công nghệ Ozone và bảo quản nhiệt độ chuẩn CA quốc tế.</p>
      <h5>Lý do bạn nên chọn Táo Envy:</h5>
      <ul>
        <li>Thịt táo giòn đanh, cắn ngập miệng cảm nhận vị ngọt đậm đà bùng nổ.</li>
        <li>Thịt táo không bị thâm đen nhanh khi gọt vỏ nhờ lượng chất chống oxy hóa cao.</li>
      </ul>
    `,
    nutrition: 'Giàu chất xơ hòa tan Pectin giúp giảm cholesterol, Vitamin C và khoáng chất tốt cho tim mạch.'
  },
  {
    id: 'sp-05',
    name: 'Bơ Sáp 034 Hữu Cơ Đắk Lắk Tuyển Chọn',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 65000,
    originalPrice: 85000,
    unit: 'kg (khoảng 2-3 quả)',
    origin: 'Cư M’gar, Đắk Lắk',
    cert: 'VietGAP',
    brix: 'Béo ngậy dẻo quánh',
    shelfLife: '3 - 6 ngày tùy độ chín',
    rating: 4.7,
    reviewCount: 88,
    salesCount: 650,
    isFeatured: false,
    isFlashSale: true,
    stock: 50,
    images: [
      'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1601039641847-7857b994d704?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Bơ 034 dáng dài quả cong nhẹ, hạt bé xíu, cơm vàng ươm dẻo như sáp, độ béo ngậy số 1 Việt Nam.',
    fullDesc: `
      <p>Bơ sáp 034 được thu hoạch từ những cây bơ lâu năm tại vùng đất đỏ bazan Đắk Lắk. Trái bơ dài từ 25 - 35cm, vỏ mỏng xanh bóng, chín đều từ cuống đến đuôi.</p>
      <h5>Đặc điểm nổi trội:</h5>
      <ul>
        <li>Cơm bơ đặc, dẻo quánh béo ngậy, không xơ, không đắng.</li>
        <li>Thích hợp làm sinh tố, salad ăn kiêng, dầm sữa chua hoặc làm món ăn dặm cho bé.</li>
      </ul>
    `,
    nutrition: 'Cung cấp gần 20 loại vitamin, acid béo không bão hòa đơn Oleic Acid cực tốt cho tim và não bộ.'
  },
  {
    id: 'sp-06',
    name: 'Bưởi Da Xanh Ruột Hồng Bến Tre (Hàng VIP)',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 75000,
    originalPrice: 95000,
    unit: 'kg (Trái từ 1.4 - 1.8kg)',
    origin: 'Châu Thành, Bến Tre',
    cert: 'VietGAP / OCOP 5 Sao',
    brix: '12° - 14° Brix (Ngọt thanh không the)',
    shelfLife: '15 - 30 ngày',
    rating: 4.9,
    reviewCount: 164,
    salesCount: 1800,
    isFeatured: true,
    isFlashSale: false,
    stock: 80,
    images: [
      'https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Bưởi da xanh vỏ mỏng dễ bóc, tép bưởi hồng tươi căng mọng, ngọt đậm đà, không the cay, múi tróc đều.',
    fullDesc: `
      <p>Bưởi da xanh Bến Tre là loại quả đặc sản nức tiếng trong và ngoài nước. Từng trái bưởi được chọn lọc kỹ càng, cuống tươi lá xanh, vỏ mỏng dính và ruột hồng đỏ tự nhiên.</p>
      <h5>Ưu điểm:</h5>
      <ul>
        <li>Tép bưởi mọng nước nhưng ráo tay khi bóc, không bị nát.</li>
        <li>Vị ngọt thanh dịu mát, không hề bị đắng hay the ở cuống múi.</li>
      </ul>
    `,
    nutrition: 'Hàm lượng Vitamin C cực cao, hỗ trợ giảm cân, đào thải mỡ thừa và thanh nhiệt cơ thể.'
  },
  {
    id: 'sp-07',
    name: 'Cherry Đỏ Mỹ Nhập Khẩu Size 9.0 (Thùng 2kg)',
    category: 'nhap-khau',
    categoryName: 'Trái cây Nhập khẩu',
    season: 'trai-mua',
    seasonName: 'Trái mùa (Nông nghiệp CNC)',
    price: 790000,
    originalPrice: 950000,
    unit: 'hộp 1kg',
    origin: 'Washington / California, USA',
    cert: 'USDA Organic / GlobalGAP',
    brix: '19° - 23° Brix',
    shelfLife: '5 - 7 ngày bảo quản 0 - 4°C',
    rating: 5.0,
    reviewCount: 82,
    salesCount: 520,
    isFeatured: true,
    isFlashSale: true,
    stock: 25,
    images: [
      'https://images.unsplash.com/photo-1528821128474-27f963b062bf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Cherry đỏ Mỹ trái to đanh cuống xanh tươi rói, thịt giòn ngọt lịm mọng nước, hạt nhỏ xinh.',
    fullDesc: `
      <p>Cherry đỏ Mỹ được vận chuyển bằng đường bay trong vòng 48h sau thu hoạch. Trái cherry căng mọng với màu đỏ đậm quyến rũ, cắn vào giòn rụm phát ra tiếng tanh tách thích thú.</p>
    `,
    nutrition: 'Chứa chất chống viêm Anthocyanin, Melatonin tự nhiên giúp ngủ sâu giấc, tốt cho người bị gút.'
  },
  {
    id: 'sp-08',
    name: 'Cam Sành Hàm Yên Mọng Nước Chuẩn Hữu Cơ',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 45000,
    originalPrice: 60000,
    unit: 'kg (khoảng 3-4 quả)',
    origin: 'Hàm Yên, Tuyên Quang',
    cert: 'VietGAP',
    brix: '11° - 13° Brix (Vắt nước nhiều)',
    shelfLife: '7 - 10 ngày',
    rating: 4.6,
    reviewCount: 75,
    salesCount: 1540,
    isFeatured: false,
    isFlashSale: false,
    stock: 150,
    images: [
      'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Cam sành Hàm Yên vỏ sần mỏng, tép vàng cam óng ả, nhiều nước thơm nức, vị ngọt thanh đậm vị.',
    fullDesc: `
      <p>Cam sành Hàm Yên được trồng trên vùng đồi đất sỏi Tuyên Quang. Quả cam nặng tay, vỏ mỏng dính, vắt được rất nhiều nước cam nguyên chất đậm đà không cần thêm đường.</p>
    `,
    nutrition: 'Bổ sung năng lượng tức thì, tăng cường sức đề kháng cho cơ thể chống cảm cúm.'
  },
  {
    id: 'sp-09',
    name: 'Kiwi Vàng SunGold Zespri New Zealand',
    category: 'nhap-khau',
    categoryName: 'Trái cây Nhập khẩu',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 210000,
    originalPrice: 260000,
    unit: 'hộp 500g (khoảng 4 quả)',
    origin: 'Bay of Plenty, New Zealand',
    cert: 'GlobalGAP',
    brix: '16° - 18° Brix (Ngọt thanh mát)',
    shelfLife: '10 - 15 ngày trong tủ mát',
    rating: 4.9,
    reviewCount: 112,
    salesCount: 920,
    isFeatured: false,
    isFlashSale: false,
    stock: 40,
    images: [
      'https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Kiwi vàng ruột vàng ươm như mật, vỏ mượt không lông, vị ngọt thanh mát, giàu dinh dưỡng gấp 3 lần cam.',
    fullDesc: `
      <p>Kiwi vàng Zespri SunGold New Zealand là thương hiệu kiwi số 1 thế giới. Trái kiwi hình bầu dục, vỏ nhẵn mịn, thịt quả vàng óng mọng nước với hạt đen nhỏ ăn giòn sần sật.</p>
    `,
    nutrition: 'Chứa hàm lượng Vitamin C cao nhất trong các loại trái cây ăn liền, enzyme Actinidin hỗ trợ tiêu hóa protein.'
  },
  {
    id: 'sp-10',
    name: 'Xoài Cát Hòa Lộc Tiền Giang Hàng Loại 1',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 110000,
    originalPrice: 135000,
    unit: 'kg (khoảng 2 quả)',
    origin: 'Cái Bè, Tiền Giang',
    cert: 'VietGAP',
    brix: '18° - 20° Brix',
    shelfLife: '3 - 5 ngày',
    rating: 4.8,
    reviewCount: 130,
    salesCount: 1100,
    isFeatured: true,
    isFlashSale: true,
    stock: 70,
    images: [
      'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Xoài cát Hòa Lộc quả thon dài, thịt vàng ươm mịn màng không xơ, hương thơm ngạt ngào đặc trưng Nam Bộ.',
    fullDesc: `
      <p>Xoài cát Hòa Lộc Tiền Giang được mệnh danh là vua của các loài xoài Việt Nam. Khi chín, vỏ chuyển màu vàng tươi bóng mọng, thịt xoài chắc nịch, ngọt thơm sâu lắng.</p>
    `,
    nutrition: 'Chứa Beta-carotene tốt cho mắt và da, giàu chất xơ và enzyme tiêu hóa tự nhiên.'
  },
  {
    id: 'sp-11',
    name: 'Giỏ Quà Trái Cây Cao Cấp "Phú Quý Bình An"',
    category: 'hop-qua',
    categoryName: 'Giỏ quà & Hộp quà VIP',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 1250000,
    originalPrice: 1450000,
    unit: 'giỏ quà VIP',
    origin: 'Nhập khẩu & Nội địa tuyển chọn',
    cert: 'GlobalGAP / VietGAP',
    brix: 'Trái cây ngọt hảo hạng',
    shelfLife: 'Giao ngay trong 2h',
    rating: 5.0,
    reviewCount: 45,
    salesCount: 380,
    isFeatured: true,
    isFlashSale: false,
    stock: 15,
    images: [
      'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Giỏ quà sang trọng kết hợp Nho Mẫu Đơn, Táo Envy, Cherry Mỹ, Lê Hàn Quốc cùng hoa tươi nghệ thuật.',
    fullDesc: `
      <p>Giỏ quà trái cây "Phú Quý Bình An" được thiết kế tinh xảo với ruy băng cao cấp, giỏ mây tự nhiên và hoa tươi trang trí. Rất phù hợp làm quà biếu đối tác, tân gia, mừng thọ, lễ tết sang trọng.</p>
    `,
    nutrition: 'Tổng hợp các loại siêu hoa quả dinh dưỡng cao cấp nhất.'
  },
  {
    id: 'sp-12',
    name: 'Hộp Quà Trái Cây "Sức Khỏe Vàng" Eco Box',
    category: 'hop-qua',
    categoryName: 'Giỏ quà & Hộp quà VIP',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 850000,
    originalPrice: 990000,
    unit: 'hộp quà sang trọng',
    origin: 'Nhập khẩu chính ngạch',
    cert: 'GlobalGAP',
    brix: 'Tuyển chọn loại 1',
    shelfLife: 'Bảo quản mát',
    rating: 4.9,
    reviewCount: 38,
    salesCount: 290,
    isFeatured: false,
    isFlashSale: false,
    stock: 20,
    images: [
      'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Hộp quà nắp kính cứng cáp bọc nơ lụa, gồm Kiwi Vàng, Táo Envy, Dâu Tây Mộc Châu và Cam Cara ruột đỏ.',
    fullDesc: `<p>Món quà sức khỏe ý nghĩa gửi trao yêu thương đến người thân, đồng nghiệp.</p>`,
    nutrition: 'Bồi bổ sức khỏe toàn diện.'
  },
  {
    id: 'sp-13',
    name: 'Việt Quất Hữu Cơ Hộp 125g Nhập Khẩu Mỹ',
    category: 'nhap-khau',
    categoryName: 'Trái cây Nhập khẩu',
    season: 'trai-mua',
    seasonName: 'Trái mùa (Nông nghiệp CNC)',
    price: 95000,
    originalPrice: 120000,
    unit: 'hộp 125g',
    origin: 'Oregon, USA',
    cert: 'USDA Organic',
    brix: '14° - 16° Brix',
    shelfLife: '7 - 10 ngày trong tủ lạnh',
    rating: 4.8,
    reviewCount: 67,
    salesCount: 780,
    isFeatured: false,
    isFlashSale: false,
    stock: 40,
    images: [
      'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Việt quất trái đanh tròn phủ phấn trắng tự nhiên, vị ngọt thanh pha chua nhẹ, siêu thực phẩm cho trí não.',
    fullDesc: `<p>Việt quất Mỹ hữu cơ được thu hoạch nghiêm ngặt, giữ trọn vẹn lớp phấn trắng bảo vệ tự nhiên.</p>`,
    nutrition: 'Chứa lượng Anthocyanin vượt trội, tăng cường trí nhớ và thị lực mắt.'
  },
  {
    id: 'sp-14',
    name: 'Măng Cụt Lái Thiêu Ruột Trắng Muốt (Bao Ăn)',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 95000,
    originalPrice: 125000,
    unit: 'kg (khoảng 8-10 quả)',
    origin: 'Thuận An, Bình Dương',
    cert: 'VietGAP',
    brix: '16° - 18° Brix (Ngọt mát chua thanh)',
    shelfLife: '3 - 5 ngày',
    rating: 4.9,
    reviewCount: 156,
    salesCount: 1300,
    isFeatured: true,
    isFlashSale: true,
    stock: 55,
    images: [
      'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Măng cụt Lái Thiêu nổi tiếng vỏ mỏng nhiều múi, tép trắng ngần như hoa bưởi, vị ngọt thanh tao.',
    fullDesc: `<p>Nữ hoàng trái cây nhiệt đới với hương vị chua ngọt hài hòa, thanh nhiệt cơ thể tuyệt vời.</p>`,
    nutrition: 'Chứa hợp chất Xanthone kháng viêm tự nhiên, giải nhiệt mùa hè.'
  },
  {
    id: 'sp-15',
    name: 'Dưa Lưới Huỳnh Long Ruột Cam Giòn Ngọt',
    category: 'noi-dia',
    categoryName: 'Trái cây Nội địa',
    season: 'trai-mua',
    seasonName: 'Trái mùa (Nông nghiệp CNC)',
    price: 85000,
    originalPrice: 105000,
    unit: 'kg (Trái 1.5 - 2.0kg)',
    origin: 'Tây Ninh (Nhà màng Israel)',
    cert: 'GlobalGAP',
    brix: '15° - 17° Brix',
    shelfLife: '7 - 12 ngày',
    rating: 4.7,
    reviewCount: 92,
    salesCount: 840,
    isFeatured: false,
    isFlashSale: false,
    stock: 35,
    images: [
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Dưa lưới Huỳnh Long vỏ vàng kim vân lưới nổi rõ, ruột cam giòn ngọt thơm mát, ăn mát lịm.',
    fullDesc: `<p>Trồng trong nhà kính công nghệ tưới nhỏ giọt Israel, bảo đảm không thuốc bảo vệ thực vật.</p>`,
    nutrition: 'Nhiều nước, Vitamin A, Vitamin C giải nhiệt cơ thể tức thì.'
  },
  {
    id: 'sp-16',
    name: 'Trái Cây Sấy Dẻo Thập Cẩm Hữu Cơ (Hộp 400g)',
    category: 'say-nuoc-ep',
    categoryName: 'Trái cây sấy & Nước ép',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 135000,
    originalPrice: 160000,
    unit: 'hộp 400g',
    origin: 'Đà Lạt, Lâm Đồng',
    cert: 'HACCP / ISO 22000',
    brix: 'Không đường hóa học',
    shelfLife: '6 tháng',
    rating: 4.8,
    reviewCount: 78,
    salesCount: 1650,
    isFeatured: false,
    isFlashSale: false,
    stock: 90,
    images: [
      'https://images.unsplash.com/photo-1595475207225-428b62bda831?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Mix xoài sấy dẻo, ổi hồng, thanh long ruột đỏ và dứa sấy lạnh giữ trọn 95% vitamin tự nhiên.',
    fullDesc: `<p>Công nghệ sấy lạnh hồng ngoại hiện đại giữ nguyên màu sắc, độ dẻo tự nhiên và hương vị nguyên bản.</p>`,
    nutrition: 'Ăn vặt lành mạnh, giàu chất xơ, không chất bảo quản.'
  },
  {
    id: 'sp-17',
    name: 'Nước Ép Lựu Đỏ & Táo Envy Ép Lạnh Cold-Pressed',
    category: 'say-nuoc-ep',
    categoryName: 'Trái cây sấy & Nước ép',
    season: 'quanh-nam',
    seasonName: 'Quanh năm / Nhập khẩu',
    price: 65000,
    originalPrice: 80000,
    unit: 'chai 330ml',
    origin: 'Ép tươi tại kho GreenFruit',
    cert: 'Chuẩn ATVSTP',
    brix: '100% nguyên chất không đường',
    shelfLife: '48h ở nhiệt độ 2 - 4°C',
    rating: 4.9,
    reviewCount: 64,
    salesCount: 890,
    isFeatured: false,
    isFlashSale: true,
    stock: 30,
    images: [
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: '100% từ lựu đỏ Ấn Độ và táo Envy tươi mới hái, ép lạnh thủy lực không gia nhiệt giữ nguyên enzyme quý.',
    fullDesc: `<p>Nước ép nguyên chất giúp sáng da, mờ thâm nám, detox cơ thể nhẹ nhàng sảng khoái.</p>`,
    nutrition: 'Nguồn chất chống oxy hóa Polyphenol cực mạnh cho làn da.'
  },
  {
    id: 'sp-18',
    name: 'Lê Nâu Hàn Quốc Chuẩn Xuất Khẩu (Hộp 3 Quả)',
    category: 'nhap-khau',
    categoryName: 'Trái cây Nhập khẩu',
    season: 'dung-mua',
    seasonName: 'Đúng mùa thu hoạch',
    price: 240000,
    originalPrice: 285000,
    unit: 'hộp 3 quả (~1.5kg)',
    origin: 'Naju, Hàn Quốc',
    cert: 'GlobalGAP',
    brix: '14° - 16° Brix',
    shelfLife: '2 - 3 tuần trong tủ mát',
    rating: 4.8,
    reviewCount: 83,
    salesCount: 670,
    isFeatured: false,
    isFlashSale: false,
    stock: 45,
    images: [
      'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?auto=format&fit=crop&w=800&q=80'
    ],
    shortDesc: 'Lê nâu Hàn Quốc quả to tròn màu vàng nâu đồng đều, thịt lê trắng giòn tan, siêu nhiều nước ngọt lịm.',
    fullDesc: `<p>Lê nâu Naju Hàn Quốc bổ phế thanh nhiệt, trị ho khan và làm dịu cổ họng hiệu quả.</p>`,
    nutrition: 'Nhiều nước, khoáng chất Kali, làm dịu họng và giải khát ngày hè.'
  }
];

// Danh sách mã khuyến mãi (Voucher)
const DEFAULT_VOUCHERS = [
  {
    code: 'FRESH2026',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: 100000,
    minOrder: 200000,
    description: 'Giảm 10% tối đa 100.000đ cho đơn từ 200.000đ',
    expiry: '31/12/2026'
  },
  {
    code: 'FREESHIP',
    discountType: 'shipping',
    discountValue: 30000,
    maxDiscount: 30000,
    minOrder: 300000,
    description: 'Miễn phí vận chuyển (giảm 30.000đ) cho đơn từ 300.000đ',
    expiry: '31/12/2026'
  },
  {
    code: 'ORGANIC50K',
    discountType: 'fixed',
    discountValue: 50000,
    maxDiscount: 50000,
    minOrder: 500000,
    description: 'Giảm ngay 50.000đ trực tiếp cho đơn hàng từ 500.000đ',
    expiry: '31/12/2026'
  }
];

// Người dùng mẫu ban đầu
const DEFAULT_USER = {
  id: 'usr_001',
  fullName: 'Nguyễn Văn Xanh',
  email: 'demo@greenfruit.vn',
  password: 'password123',
  phone: '0909123456',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  address: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  membership: 'Khách hàng Thân Thiết (Gold)',
  points: 1250,
  walletBalance: 3500000, // Ví tiền điện tử mô phỏng
  joinedDate: '15/01/2025'
};

// Đơn hàng mẫu ban đầu
const DEFAULT_ORDERS = [
  {
    id: 'GF-982145',
    date: '10/09/2026 14:30',
    status: 'completed',
    statusText: 'Đã hoàn thành',
    badgeColor: 'bg-success',
    items: [
      { id: 'sp-01', name: 'Sầu riêng Ri6 Chín Cây Bến Tre', price: 165000, qty: 2, unit: 'kg', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&w=800&q=80' },
      { id: 'sp-04', name: 'Táo Envy Size L Nhập Khẩu New Zealand', price: 195000, qty: 1, unit: 'kg', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80' }
    ],
    subtotal: 525000,
    shippingFee: 0,
    discount: 50000,
    total: 475000,
    paymentMethod: 'VNPAY (Sandbox)',
    paymentStatus: 'Đã thanh toán',
    shippingAddress: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    trackingCode: 'VNPOST-8891042'
  },
  {
    id: 'GF-981023',
    date: '05/09/2026 09:15',
    status: 'shipping',
    statusText: 'Đang giao hàng',
    badgeColor: 'bg-primary',
    items: [
      { id: 'sp-02', name: 'Nho Mẫu Đơn Shine Muscat Nhật Bản', price: 680000, qty: 1, unit: 'chùm (~750g)', image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=80' },
      { id: 'sp-03', name: 'Dâu Tây Giống Nhật Mộc Châu Hữu Cơ', price: 180000, qty: 2, unit: 'hộp 500g', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80' }
    ],
    subtotal: 1040000,
    shippingFee: 0,
    discount: 100000,
    total: 940000,
    paymentMethod: 'Chuyển khoản VietQR',
    paymentStatus: 'Đã thanh toán',
    shippingAddress: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    trackingCode: 'GHN-9920145'
  },
  {
    id: 'GF-979941',
    date: '28/08/2026 16:45',
    status: 'pending',
    statusText: 'Chờ xác nhận',
    badgeColor: 'bg-warning text-dark',
    items: [
      { id: 'sp-05', name: 'Bơ Sáp 034 Hữu Cơ Đắk Lắk Tuyển Chọn', price: 65000, qty: 3, unit: 'kg', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80' }
    ],
    subtotal: 195000,
    shippingFee: 30000,
    discount: 0,
    total: 225000,
    paymentMethod: 'Thanh toán khi nhận hàng (COD)',
    paymentStatus: 'Chưa thanh toán',
    shippingAddress: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    trackingCode: 'Đang tạo đơn...'
  }
];

// Khởi tạo Database nếu chưa tồn tại trong LocalStorage
function initDatabase() {
  if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
    localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
    localStorage.setItem(DB_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem(DB_KEYS.VOUCHERS)) {
    localStorage.setItem(DB_KEYS.VOUCHERS, JSON.stringify(DEFAULT_VOUCHERS));
  }
  if (!localStorage.getItem(DB_KEYS.USERS)) {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify([DEFAULT_USER]));
  }
  // IMPORTANT: Do NOT auto-set CURRENT_USER to DEFAULT_USER so guest state is truly unauthenticated
  if (!localStorage.getItem(DB_KEYS.ORDERS)) {
    localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.REVIEWS)) {
    localStorage.setItem(DB_KEYS.REVIEWS, JSON.stringify(DEFAULT_REVIEWS));
  }
  if (!localStorage.getItem(DB_KEYS.CART)) {
    localStorage.setItem(DB_KEYS.CART, JSON.stringify([]));
  }
}

// Chạy khởi tạo ngay khi nạp file
initDatabase();


// ==================== CÁC HÀM TRUY XUẤT DATABASE (CRUD) ====================

// Lấy danh sách sản phẩm
function getProducts() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.PRODUCTS)) || DEFAULT_PRODUCTS;
  } catch (e) {
    return DEFAULT_PRODUCTS;
  }
}

// Lấy chi tiết sản phẩm theo ID hoặc Slug
function getProductById(id) {
  if (!id) return null;
  const products = getProducts();
  const target = String(id).toLowerCase().trim();
  return products.find(p => String(p.id).toLowerCase() === target || (p.slug && p.slug.toLowerCase() === target)) || null;
}

// Lấy danh mục
function getCategories() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

// Lấy giỏ hàng
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.CART)) || [];
  } catch (e) {
    return [];
  }
}

// Lưu giỏ hàng
function saveCart(cart) {
  localStorage.setItem(DB_KEYS.CART, JSON.stringify(cart));
  if (window.updateCartBadge) {
    window.updateCartBadge();
  }
}

// Thêm sản phẩm vào giỏ
function addToCart(productId, qty = 1, unit = null) {
  const cart = getCart();
  const product = getProductById(productId);
  if (!product) return false;

  const existingItemIndex = cart.findIndex(item => item.id === productId);
  if (existingItemIndex > -1) {
    cart[existingItemIndex].qty += Number(qty);
  } else {
    cart.push({
      id: productId,
      qty: Number(qty),
      unit: unit || product.unit
    });
  }

  saveCart(cart);
  return true;
}

// Cập nhật số lượng trong giỏ
function updateCartQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter(item => item.id !== productId);
  } else {
    const item = cart.find(item => item.id === productId);
    if (item) {
      item.qty = Number(qty);
    }
  }
  saveCart(cart);
}

// Xóa sản phẩm khỏi giỏ
function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);
}

// Xóa trắng giỏ hàng
function clearCart() {
  saveCart([]);
}

// Lấy thông tin user hiện tại
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER)) || null;
  } catch (e) {
    return null;
  }
}

// Cập nhật user hiện tại
function setCurrentUser(user) {
  localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
  // Cập nhật luôn trong danh sách users
  const users = getUsers();
  const index = users.findIndex(u => u.email === user.email);
  if (index > -1) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
}

// Lấy danh sách users
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.USERS)) || [DEFAULT_USER];
  } catch (e) {
    return [DEFAULT_USER];
  }
}

// Lấy danh sách đơn hàng
function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.ORDERS)) || [];
  } catch (e) {
    return [];
  }
}

// Lưu đơn hàng mới
function createOrder(orderData) {
  const orders = getOrders();
  orders.unshift(orderData);
  localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
  return orderData;
}

// Lấy danh sách Voucher
function getVouchers() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEYS.VOUCHERS)) || DEFAULT_VOUCHERS;
  } catch (e) {
    return DEFAULT_VOUCHERS;
  }
}

// Kiểm tra mã giảm giá
function checkVoucher(code, subtotal) {
  const vouchers = getVouchers();
  const voucher = vouchers.find(v => v.code.toUpperCase() === code.trim().toUpperCase());
  if (!voucher) {
    return { success: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' };
  }
  if (subtotal < voucher.minOrder) {
    return {
      success: false,
      message: `Đơn hàng tối thiểu để áp dụng mã này là ${formatCurrency(voucher.minOrder)}.`
    };
  }

  let discount = 0;
  if (voucher.discountType === 'percent') {
    discount = (subtotal * voucher.discountValue) / 100;
    if (discount > voucher.maxDiscount) discount = voucher.maxDiscount;
  } else if (voucher.discountType === 'fixed') {
    discount = voucher.discountValue;
  } else if (voucher.discountType === 'shipping') {
    discount = voucher.discountValue;
  }

  return {
    success: true,
    voucher: voucher,
    discountAmount: discount,
    message: `Áp dụng thành công mã ${voucher.code}! Giảm ${formatCurrency(discount)}`
  };
}

// Lấy danh sách reviews theo ID sản phẩm
function getReviewsForProduct(productId) {
  try {
    const allReviews = JSON.parse(localStorage.getItem(DB_KEYS.REVIEWS)) || DEFAULT_REVIEWS;
    const key = String(productId);
    return allReviews[key] || allReviews[productId] || DEFAULT_REVIEWS[key] || DEFAULT_REVIEWS[productId] || [];
  } catch (e) {
    return DEFAULT_REVIEWS[productId] || [];
  }
}

// Thêm review mới cho sản phẩm
function addReview(productId, reviewData) {
  try {
    const allReviews = JSON.parse(localStorage.getItem(DB_KEYS.REVIEWS)) || DEFAULT_REVIEWS;
    if (!allReviews[productId]) {
      allReviews[productId] = [];
    }
    allReviews[productId].unshift(reviewData);
    localStorage.setItem(DB_KEYS.REVIEWS, JSON.stringify(allReviews));
    return true;
  } catch (e) {
    return false;
  }
}

// Định dạng tiền tệ VNĐ
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

// Reset dữ liệu về ban đầu (Dành cho việc test)
function resetDatabase() {
  localStorage.clear();
  initDatabase();
  location.reload();
}
