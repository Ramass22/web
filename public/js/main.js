/**
 * Warung Soto Nusantara - Interactive Client Script
 * Mengelola fitur interaktif: Keranjang Belanja, Live Search, Filter Kategori,
 * Favorit (LocalStorage), Quick View Modal, Live Price Calculator, dan Pesan via WhatsApp.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. STATE & STORAGE MANAGEMENT
  // ==========================================
  const STORAGE_CART_KEY = 'wsn_cart_items_v1';
  const STORAGE_FAV_KEY = 'wsn_favorites_v1';
  const WA_PHONE_NUMBER = '6281234567890'; // Nomor WhatsApp Warung Soto

  let cart = [];
  let favorites = [];
  let menuDatabase = [];

  // Inisialisasi data menu dari window atau DOM
  function initMenuDatabase() {
    if (typeof window !== 'undefined' && Array.isArray(window.SERVER_MENU_DATA) && window.SERVER_MENU_DATA.length > 0) {
      menuDatabase = window.SERVER_MENU_DATA;
      return;
    }

    try {
      const rawData = document.getElementById('serverMenuData');
      if (rawData) {
        if (rawData.dataset.items) {
          menuDatabase = JSON.parse(decodeURIComponent(rawData.dataset.items));
        } else if (rawData.textContent.trim()) {
          menuDatabase = JSON.parse(rawData.textContent.trim());
        }
      }
    } catch (e) {
      console.warn('Gagal membaca data menu:', e);
    }

    // Fallback otomatis dari DOM kartu menu jika belum ada
    if (menuDatabase.length === 0) {
      document.querySelectorAll('#menuGrid .menu-card').forEach(card => {
        const img = card.querySelector('img');
        const desc = card.querySelector('.card-desc');
        const time = card.querySelector('.card-time');
        menuDatabase.push({
          id: card.dataset.id || '',
          nama: card.dataset.nama || '',
          kategori: card.dataset.kategori || 'makanan',
          harga: Number(card.dataset.harga || 0),
          rating: Number(card.dataset.rating || 4.8),
          terlaris: card.dataset.terlaris === 'true',
          foto: img ? img.src : '',
          deskripsi: desc ? desc.textContent.trim() : '',
          estimasi: time ? time.textContent.trim() : '10-15 mnt',
          kalori: '320 kkal',
          porsi: '1 Porsi',
          ulasan: 100
        });
      });
    }
  }

  // Muat data dari localStorage
  function loadStoredData() {
    try {
      const savedCart = localStorage.getItem(STORAGE_CART_KEY);
      if (savedCart) cart = JSON.parse(savedCart);
    } catch (e) {
      cart = [];
    }

    try {
      const savedFavs = localStorage.getItem(STORAGE_FAV_KEY);
      if (savedFavs) favorites = JSON.parse(savedFavs);
    } catch (e) {
      favorites = [];
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  function saveFavorites() {
    localStorage.setItem(STORAGE_FAV_KEY, JSON.stringify(favorites));
    updateFavoritesUI();
  }

  // ==========================================
  // 2. FORMATTER & UTILITIES
  // ==========================================
  function formatRupiah(number) {
    return 'Rp ' + Number(number).toLocaleString('id-ID');
  }

  function showToast(message, type = 'success', icon = 'fa-circle-check') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Tutup notifikasi">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Auto dismiss after 3.2 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3200);
  }

  // ==========================================
  // 3. CART SYSTEM (KERANJANG PESANAN)
  // ==========================================
  function updateCartUI() {
    const counterBadge = document.getElementById('cartCounter');
    const drawerBadge = document.getElementById('cartDrawerCount');
    const itemsList = document.getElementById('cartItemsList');
    const footer = document.getElementById('cartFooter');
    const subtotalEl = document.getElementById('cartSubtotal');
    const grandTotalEl = document.getElementById('cartGrandTotal');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (counterBadge) {
      counterBadge.textContent = totalItems;
      if (totalItems > 0) {
        counterBadge.classList.add('badge-bump');
        setTimeout(() => counterBadge.classList.remove('badge-bump'), 300);
      }
    }

    if (drawerBadge) drawerBadge.textContent = `${totalItems} item`;

    if (!itemsList) return;

    if (cart.length === 0) {
      itemsList.innerHTML = `
        <div class="empty-cart-state">
          <span class="empty-icon">🥣</span>
          <p>Keranjang pesanan masih kosong</p>
          <small>Pilih hidangan soto atau minuman segar favorit Anda sekarang!</small>
        </div>
      `;
      if (footer) footer.style.display = 'none';
      return;
    }

    if (footer) footer.style.display = 'block';
    if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);
    if (grandTotalEl) grandTotalEl.textContent = formatRupiah(subtotal);

    // Render list kartu di keranjang
    itemsList.innerHTML = cart.map((item, index) => {
      const toppingsText = item.toppings && item.toppings.length > 0 
        ? `<div class="cart-item-meta"><i class="fa-solid fa-plus-circle"></i> ${item.toppings.join(', ')}</div>` 
        : '';
      const notesText = item.notes 
        ? `<div class="cart-item-notes"><i class="fa-regular fa-comment-dots"></i> "${item.notes}"</div>` 
        : '';
      const spicinessText = item.levelPedas 
        ? `<div class="cart-item-meta"><i class="fa-solid fa-pepper-hot"></i> ${item.levelPedas}</div>` 
        : '';

      return `
        <div class="cart-item-row" data-index="${index}">
          <img src="${item.foto}" alt="${item.nama}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.nama}</h4>
            <div class="cart-item-price">${formatRupiah(item.price)}</div>
            ${spicinessText}
            ${toppingsText}
            ${notesText}
            <div class="cart-item-actions">
              <div class="cart-qty-ctrl">
                <button type="button" class="btn-qty-minus" data-index="${index}">-</button>
                <span>${item.qty}</span>
                <button type="button" class="btn-qty-plus" data-index="${index}">+</button>
              </div>
              <button type="button" class="cart-item-remove" data-index="${index}" title="Hapus dari pesanan">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Pasang event listener untuk tombol jumlah & hapus di keranjang
    itemsList.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        if (cart[idx].qty > 1) {
          cart[idx].qty -= 1;
        } else {
          cart.splice(idx, 1);
        }
        saveCart();
      });
    });

    itemsList.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        cart[idx].qty += 1;
        saveCart();
      });
    });

    itemsList.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        const removed = cart.splice(idx, 1);
        saveCart();
        showToast(`${removed[0].nama} dihapus dari pesanan`, 'info', 'fa-trash-can');
      });
    });
  }

  function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function addItemToCart(item) {
    // Cari apakah item persis sudah ada di cart (nama, toppings, level)
    const existingIndex = cart.findIndex(c => 
      c.id === item.id && 
      c.levelPedas === item.levelPedas && 
      JSON.stringify(c.toppings) === JSON.stringify(item.toppings) &&
      c.notes === item.notes
    );

    if (existingIndex > -1) {
      cart[existingIndex].qty += item.qty || 1;
    } else {
      cart.push({
        id: item.id,
        nama: item.nama,
        foto: item.foto,
        price: item.price,
        qty: item.qty || 1,
        levelPedas: item.levelPedas || '',
        toppings: item.toppings || [],
        notes: item.notes || ''
      });
    }

    saveCart();
    showToast(`"${item.nama}" berhasil ditambahkan ke keranjang!`, 'success', 'fa-cart-plus');
  }

  // ==========================================
  // 4. CHECKOUT WA & SIMULASI RECEIPT
  // ==========================================
  function generateWhatsAppOrderMessage() {
    if (cart.length === 0) return '';

    const globalNotes = document.getElementById('orderNotes') ? document.getElementById('orderNotes').value.trim() : '';
    let text = `*HALO WARUNG SOTO NUSANTARA*\nSaya ingin memesan menu soto berikut:\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    let total = 0;
    cart.forEach((item, i) => {
      const sub = item.price * item.qty;
      total += sub;
      text += `*${i + 1}. ${item.nama}* (x${item.qty})\n`;
      if (item.levelPedas) text += `   • Level: ${item.levelPedas}\n`;
      if (item.toppings && item.toppings.length > 0) text += `   • Topping: ${item.toppings.join(', ')}\n`;
      if (item.notes) text += `   • Catatan: _${item.notes}_\n`;
      text += `   Harga: ${formatRupiah(sub)}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*TOTAL PEMBAYARAN: ${formatRupiah(total)}*\n`;
    if (globalNotes) {
      text += `*Catatan Dapur Umum:* ${globalNotes}\n`;
    }
    text += `\nMohon konfirmasi pesanan dan ketersediaannya. Terima kasih! 🍲`;

    return encodeURIComponent(text);
  }

  function handleCheckoutWhatsApp() {
    if (cart.length === 0) {
      showToast('Keranjang pesanan masih kosong!', 'error', 'fa-circle-exclamation');
      return;
    }
    const message = generateWhatsAppOrderMessage();
    const url = `https://wa.me/${WA_PHONE_NUMBER}?text=${message}`;
    window.open(url, '_blank');
  }

  function handleCheckoutSimulate() {
    if (cart.length === 0) {
      showToast('Keranjang pesanan masih kosong!', 'error', 'fa-circle-exclamation');
      return;
    }

    const orderId = 'WSN-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const globalNotes = document.getElementById('orderNotes') ? document.getElementById('orderNotes').value.trim() : '';
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const receiptContent = document.getElementById('receiptContent');
    if (receiptContent) {
      receiptContent.innerHTML = `
        <div class="receipt-code">No. Pesanan: <strong>#${orderId}</strong></div>
        <div class="receipt-date">${dateStr}</div>
        <div class="receipt-items-list">
          ${cart.map(item => `
            <div class="receipt-row">
              <span class="r-name">${item.nama} x${item.qty}</span>
              <span class="r-price">${formatRupiah(item.price * item.qty)}</span>
            </div>
            ${item.toppings && item.toppings.length > 0 ? `<div class="r-sub">+ ${item.toppings.join(', ')}</div>` : ''}
          `).join('')}
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-row total-receipt">
          <span>Total Akhir</span>
          <strong>${formatRupiah(total)}</strong>
        </div>
        ${globalNotes ? `<div class="receipt-notes"><strong>Catatan:</strong> ${globalNotes}</div>` : ''}
        <div class="receipt-alert">
          <i class="fa-solid fa-mug-hot"></i> Dapur telah menerima pesanan Anda. Estimasi waktu penyajian ~15 menit.
        </div>
      `;
    }

    // Tampilkan modal receipt
    const receiptModal = document.getElementById('orderSuccessModal');
    if (receiptModal) {
      receiptModal.classList.add('open');
      closeCartDrawer();
      // Kosongkan cart
      cart = [];
      saveCart();
      showToast('Pesanan berhasil dibuat!', 'success', 'fa-circle-check');
    }
  }

  // ==========================================
  // 5. FAVORITES SYSTEM (WISHLIST)
  // ==========================================
  function updateFavoritesUI() {
    // Update count pada badge navbar & pill
    const favBadge = document.getElementById('favBadge');
    const favCountPill = document.getElementById('favCountPill');
    if (favBadge) favBadge.textContent = favorites.length;
    if (favCountPill) favCountPill.textContent = favorites.length;

    // Update state tombol love di semua card
    document.querySelectorAll('.btn-fav').forEach(btn => {
      const id = btn.dataset.id;
      const isFav = favorites.includes(id);
      const icon = btn.querySelector('i');
      if (isFav) {
        btn.classList.add('active');
        if (icon) {
          icon.classList.remove('fa-regular');
          icon.classList.add('fa-solid');
        }
      } else {
        btn.classList.remove('active');
        if (icon) {
          icon.classList.remove('fa-solid');
          icon.classList.add('fa-regular');
        }
      }
    });
  }

  function toggleFavorite(id, btnElement) {
    const idx = favorites.indexOf(id);
    if (idx > -1) {
      favorites.splice(idx, 1);
      showToast('Dihapus dari daftar favorit', 'info', 'fa-heart-crack');
    } else {
      favorites.push(id);
      showToast('Ditambahkan ke favorit!', 'success', 'fa-heart');
      if (btnElement) {
        btnElement.classList.add('heart-burst');
        setTimeout(() => btnElement.classList.remove('heart-burst'), 400);
      }
    }
    saveFavorites();

    // Jika sedang dalam filter tab favorit, refresh tampilan grid
    const activePill = document.querySelector('.pill-btn.active');
    if (activePill && activePill.dataset.category === 'favorit') {
      filterMenuGrid();
    }
  }

  // ==========================================
  // 6. LIVE SEARCH, FILTER & SORTING (INDEX)
  // ==========================================
  let currentCategory = 'semua';

  function filterMenuGrid() {
    const searchInput = document.getElementById('liveSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const cards = document.querySelectorAll('#menuGrid .menu-card');
    const emptyState = document.getElementById('emptyState');
    const resultsCount = document.getElementById('resultsCount');

    let visibleCount = 0;

    cards.forEach(card => {
      const nama = (card.dataset.nama || '').toLowerCase();
      const kategori = (card.dataset.kategori || '').toLowerCase();
      const id = card.dataset.id || '';
      const desc = (card.querySelector('.card-desc') ? card.querySelector('.card-desc').textContent : '').toLowerCase();

      // Cek kategori
      let matchesCategory = false;
      if (currentCategory === 'semua') {
        matchesCategory = true;
      } else if (currentCategory === 'favorit') {
        matchesCategory = favorites.includes(id);
      } else {
        matchesCategory = (kategori === currentCategory);
      }

      // Cek kata kunci pencarian
      const matchesSearch = !query || nama.includes(query) || desc.includes(query);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
        card.classList.add('fade-in-item');
        visibleCount++;
      } else {
        card.style.display = 'none';
        card.classList.remove('fade-in-item');
      }
    });

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    if (resultsCount) {
      resultsCount.textContent = `Menampilkan ${visibleCount} pilihan menu`;
    }

    // Toggle tombol clear search
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }
  }

  function sortMenuGrid(sortType) {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.menu-card'));

    cards.sort((a, b) => {
      const priceA = Number(a.dataset.harga || 0);
      const priceB = Number(b.dataset.harga || 0);
      const nameA = (a.dataset.nama || '').toLowerCase();
      const nameB = (b.dataset.nama || '').toLowerCase();
      const ratingA = Number(a.dataset.rating || 0);
      const ratingB = Number(b.dataset.rating || 0);

      if (sortType === 'price-asc') return priceA - priceB;
      if (sortType === 'price-desc') return priceB - priceA;
      if (sortType === 'rating-desc') return ratingB - ratingA;
      if (sortType === 'name-asc') return nameA.localeCompare(nameB);
      return 0; // default
    });

    cards.forEach(card => grid.appendChild(card));
  }

  // ==========================================
  // 7. QUICK VIEW MODAL
  // ==========================================
  function openQuickView(menuId) {
    const item = menuDatabase.find(m => m.id === menuId);
    if (!item) return;

    const modal = document.getElementById('quickViewModal');
    const body = document.getElementById('quickViewBody');
    if (!modal || !body) return;

    body.innerHTML = `
      <div class="qv-grid">
        <div class="qv-media">
          <img src="${item.foto}" alt="${item.nama}">
          <span class="badge badge-${item.kategori}">${item.kategori}</span>
        </div>
        <div class="qv-info">
          <div class="qv-rating">
            <i class="fa-solid fa-star"></i> ${item.rating || '4.9'} 
            <span>(${item.ulasan || '100+'} ulasan)</span>
          </div>
          <h2 class="qv-title">${item.nama}</h2>
          <div class="qv-price">${formatRupiah(item.harga)}</div>
          <p class="qv-desc">${item.deskripsi}</p>
          
          <div class="qv-tags">
            <span><i class="fa-regular fa-clock"></i> ${item.estimasi || '10-15 mnt'}</span>
            <span><i class="fa-solid fa-fire-burner"></i> ${item.kalori || '300 kkal'}</span>
            <span><i class="fa-solid fa-bowl-food"></i> ${item.porsi || '1 Porsi'}</span>
          </div>

          <div class="qv-actions">
            <div class="qty-counter qv-qty">
              <button type="button" id="qvQtyMinus">-</button>
              <input type="number" id="qvQtyInput" value="1" readonly>
              <button type="button" id="qvQtyPlus">+</button>
            </div>
            <button type="button" class="btn btn-primary btn-large" id="qvAddToCartBtn">
              <i class="fa-solid fa-plus"></i> Tambah ke Pesanan
            </button>
            <a href="/menu/${item.id}" class="btn btn-outline">
              Halaman Penuh &rarr;
            </a>
          </div>
        </div>
      </div>
    `;

    // Modal Qty logic
    const qtyInput = body.querySelector('#qvQtyInput');
    body.querySelector('#qvQtyMinus').addEventListener('click', () => {
      let val = Number(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });
    body.querySelector('#qvQtyPlus').addEventListener('click', () => {
      let val = Number(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });

    body.querySelector('#qvAddToCartBtn').addEventListener('click', () => {
      const qty = Number(qtyInput.value) || 1;
      addItemToCart({
        id: item.id,
        nama: item.nama,
        foto: item.foto,
        price: item.harga,
        qty: qty
      });
      modal.classList.remove('open');
      document.body.style.overflow = '';
    });

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // ==========================================
  // 8. DETAIL PAGE LIVE CALCULATOR & ACTIONS
  // ==========================================
  function initDetailPageInteractive() {
    const totalEl = document.getElementById('detailLiveTotal');
    const qtyInput = document.getElementById('detailQtyInput');
    const minusBtn = document.getElementById('decreaseQtyBtn');
    const plusBtn = document.getElementById('increaseQtyBtn');
    const form = document.getElementById('detailOrderForm');

    if (!totalEl || !qtyInput) return;

    const basePrice = Number(totalEl.dataset.base || 0);

    function calculateDetailTotal() {
      const qty = Number(qtyInput.value) || 1;
      let toppingsExtra = 0;

      document.querySelectorAll('.topping-checkbox:checked').forEach(cb => {
        toppingsExtra += Number(cb.dataset.price || 0);
      });

      const total = (basePrice + toppingsExtra) * qty;
      totalEl.textContent = formatRupiah(total);
      return { total, toppingsExtra, qty };
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        let v = Number(qtyInput.value) || 1;
        if (v > 1) {
          qtyInput.value = v - 1;
          calculateDetailTotal();
        }
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        let v = Number(qtyInput.value) || 1;
        qtyInput.value = v + 1;
        calculateDetailTotal();
      });
    }

    document.querySelectorAll('.topping-checkbox').forEach(cb => {
      cb.addEventListener('change', calculateDetailTotal);
    });

    // Tambah ke Pesanan dari Halaman Detail
    const addBtn = document.getElementById('addDetailToCartBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const id = addBtn.dataset.id;
        const nama = addBtn.dataset.nama;
        const foto = addBtn.dataset.foto;
        const { total, toppingsExtra, qty } = calculateDetailTotal();

        // Ambil toppings checked
        const selectedToppings = [];
        document.querySelectorAll('.topping-checkbox:checked').forEach(cb => {
          selectedToppings.push(cb.value);
        });

        // Ambil level pedas atau es
        const levelRadio = document.querySelector('input[name="levelPedas"]:checked') || 
                           document.querySelector('input[name="iceLevel"]:checked');
        const levelVal = levelRadio ? levelRadio.value : '';

        // Ambil catatan
        const notesInput = document.getElementById('detailNotes');
        const notes = notesInput ? notesInput.value.trim() : '';

        addItemToCart({
          id: id,
          nama: nama,
          foto: foto,
          price: basePrice + toppingsExtra,
          qty: qty,
          levelPedas: levelVal,
          toppings: selectedToppings,
          notes: notes
        });

        openCartDrawer();
      });
    }

    // Direct Pesan via WhatsApp dari Halaman Detail
    const directWaBtn = document.getElementById('detailDirectWaBtn');
    if (directWaBtn) {
      directWaBtn.addEventListener('click', () => {
        const addBtn = document.getElementById('addDetailToCartBtn');
        const nama = addBtn ? addBtn.dataset.nama : 'Soto';
        const { total, qty } = calculateDetailTotal();

        const selectedToppings = [];
        document.querySelectorAll('.topping-checkbox:checked').forEach(cb => {
          selectedToppings.push(cb.value);
        });

        const levelRadio = document.querySelector('input[name="levelPedas"]:checked') || 
                           document.querySelector('input[name="iceLevel"]:checked');
        const levelVal = levelRadio ? levelRadio.value : '';
        const notesInput = document.getElementById('detailNotes');
        const notes = notesInput ? notesInput.value.trim() : '';

        let text = `*PESANAN LANGSUNG WARUNG SOTO NUSANTARA*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `*Menu:* ${nama} (x${qty})\n`;
        if (levelVal) text += `*Varian / Level:* ${levelVal}\n`;
        if (selectedToppings.length > 0) text += `*Tambahan Topping:* ${selectedToppings.join(', ')}\n`;
        if (notes) text += `*Catatan:* ${notes}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `*Total Estimasi:* ${formatRupiah(total)}\n\n`;
        text += `Halo warung soto, mohon disiapkan pesanan saya di atas ya. Terima kasih! 🍲`;

        window.open(`https://wa.me/${WA_PHONE_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
      });
    }

    // Tombol Share / Salin Tautan
    const shareBtn = document.getElementById('shareMenuBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Tautan menu berhasil disalin ke clipboard!', 'success', 'fa-copy');
          }).catch(() => {
            showToast('Gagal menyalin tautan', 'error', 'fa-circle-xmark');
          });
        } else {
          showToast('Tautan: ' + window.location.href, 'info', 'fa-link');
        }
      });
    }
  }

  // ==========================================
  // 9. EVENT LISTENERS INITIALIZATION
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    initMenuDatabase();
    loadStoredData();
    updateCartUI();
    updateFavoritesUI();
    initDetailPageInteractive();

    // 1. Cart Drawer Toggle
    const openCartBtn = document.getElementById('openCartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartOverlay = document.getElementById('cartOverlay');

    if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

    // 2. Checkout Buttons
    const checkoutWaBtn = document.getElementById('checkoutWaBtn');
    const checkoutSimBtn = document.getElementById('checkoutSimulateBtn');
    if (checkoutWaBtn) checkoutWaBtn.addEventListener('click', handleCheckoutWhatsApp);
    if (checkoutSimBtn) checkoutSimBtn.addEventListener('click', handleCheckoutSimulate);

    // Close Receipt Modal
    const closeReceiptBtn = document.getElementById('closeReceiptBtn');
    const receiptModal = document.getElementById('orderSuccessModal');
    if (closeReceiptBtn && receiptModal) {
      closeReceiptBtn.addEventListener('click', () => {
        receiptModal.classList.remove('open');
      });
    }

    // 3. Quick View Modal Close
    const closeQvBtn = document.getElementById('closeQuickViewBtn');
    const qvModal = document.getElementById('quickViewModal');
    if (closeQvBtn) closeQvBtn.addEventListener('click', closeQuickView);
    if (qvModal) {
      qvModal.addEventListener('click', (e) => {
        if (e.target === qvModal) closeQuickView();
      });
    }

    // 4. Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
      });
    }

    // 5. Live Search
    const liveSearchInput = document.getElementById('liveSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (liveSearchInput) {
      liveSearchInput.addEventListener('input', () => {
        filterMenuGrid();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (liveSearchInput) {
          liveSearchInput.value = '';
          liveSearchInput.focus();
        }
        filterMenuGrid();
      });
    }

    // 6. Category Pills (Interactive Instant Filter)
    const pills = document.querySelectorAll('.pill-btn');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        currentCategory = pill.dataset.category || 'semua';

        // Sinkronkan juga select form server-side
        const serverSelect = document.getElementById('kategori');
        if (serverSelect && (currentCategory === 'semua' || currentCategory === 'makanan' || currentCategory === 'minuman')) {
          serverSelect.value = currentCategory;
        }

        filterMenuGrid();
      });
    });

    // 7. Reset Filter Button in Empty State
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        if (liveSearchInput) liveSearchInput.value = '';
        currentCategory = 'semua';
        pills.forEach(p => {
          if (p.dataset.category === 'semua') p.classList.add('active');
          else p.classList.remove('active');
        });
        const serverSelect = document.getElementById('kategori');
        if (serverSelect) serverSelect.value = 'semua';
        filterMenuGrid();
      });
    }

    // 8. Sorting Selector
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        sortMenuGrid(sortSelect.value);
      });
    }

    // 9. Delegated Click Handlers on Menu Grid (Add to Order, Quick View, Favorite)
    const menuGrid = document.getElementById('menuGrid');
    if (menuGrid) {
      menuGrid.addEventListener('click', (e) => {
        // Klik Tombol Favorit
        const favBtn = e.target.closest('.btn-fav');
        if (favBtn) {
          e.preventDefault();
          const menuId = favBtn.dataset.id;
          toggleFavorite(menuId, favBtn);
          return;
        }

        // Klik Tombol Quick View
        const qvBtn = e.target.closest('.btn-quickview');
        if (qvBtn) {
          e.preventDefault();
          const menuId = qvBtn.dataset.id;
          openQuickView(menuId);
          return;
        }

        // Klik Tombol Tambah / Pesan Langsung
        const addBtn = e.target.closest('.btn-add-order');
        if (addBtn) {
          e.preventDefault();
          const id = addBtn.dataset.id;
          const nama = addBtn.dataset.nama;
          const harga = Number(addBtn.dataset.harga);
          const foto = addBtn.dataset.foto;

          addItemToCart({
            id: id,
            nama: nama,
            foto: foto,
            price: harga,
            qty: 1
          });
          return;
        }
      });
    }

    // 10. Detail Page Favorite Button
    const detailFavBtn = document.querySelector('.detail-fav-btn');
    if (detailFavBtn) {
      detailFavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = detailFavBtn.dataset.id;
        toggleFavorite(id, detailFavBtn);
      });
    }

    // 11. Nav Favorites Shortcut Click
    const navFavoritesBtn = document.getElementById('navFavoritesBtn');
    if (navFavoritesBtn) {
      navFavoritesBtn.addEventListener('click', (e) => {
        const pillFav = document.getElementById('pillFavorites');
        if (pillFav) {
          e.preventDefault();
          pillFav.click();
          const katalogEl = document.getElementById('katalog');
          if (katalogEl) katalogEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 12. Global ESC Key Handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCartDrawer();
        closeQuickView();
        const receiptModal = document.getElementById('orderSuccessModal');
        if (receiptModal) receiptModal.classList.remove('open');
      }
    });
  });
})();
