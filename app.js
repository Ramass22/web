const express = require('express');
const path = require('path');
const menuRoutes = require('./routes/menuRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi EJS & Path Absolut
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Path absolut ke direktori views

// Middleware Static Files dengan Path Absolut
app.use(express.static(path.join(__dirname, 'public')));

// Middleware Parsing Body
app.use(express.urlencoded({ extended: true }));

// Routing Utama
app.use('/', menuRoutes);

// Handling 404 (Halaman Tidak Ditemukan)
app.use((req, res) => {
  res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
});

app.listen(PORT, () => {
  console.log(`Server Warung Soto berjalan di http://localhost:${PORT}`);
});