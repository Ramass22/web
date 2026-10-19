const menuSoto = require('../data/dataSoto');

// Halaman Katalog / Daftar dengan Filter Query Parameter (req.query)
exports.getKatalog = (req, res) => {
  const { kategori } = req.query; // Membaca req.query
  let filteredMenu = menuSoto;

  if (kategori && kategori !== 'semua') {
    filteredMenu = menuSoto.filter(
      item => item.kategori.toLowerCase() === kategori.toLowerCase()
    );
  }

  // Mengirim data secara utuh ke view
  res.render('index', {
    title: 'Katalog Menu Warung Soto',
    menuList: filteredMenu,
    selectedKategori: kategori || 'semua'
  });
};

// Halaman Detail berdasarkan Route Parameter (req.params)
exports.getDetail = (req, res) => {
  const { id } = req.params; // Membaca req.params
  const menuItem = menuSoto.find(item => item.id === id);

  if (!menuItem) {
    return res.status(404).render('404', {
      title: 'Menu Tidak Ditemukan'
    });
  }

  res.render('detail', {
    title: `Detail - ${menuItem.nama}`,
    menu: menuItem
  });
};