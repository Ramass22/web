const express = require('express');
const router = express.Router();
const menuControllers = require('../controllers/menuControllers');

// Route Katalog (Filter via req.query)
router.get('/', menuControllers.getKatalog);

// Route Detail (via req.params ID)
router.get('/menu/:id', menuControllers.getDetail);

module.exports = router;