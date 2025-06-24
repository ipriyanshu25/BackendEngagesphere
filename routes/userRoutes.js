// routes/user.js (or wherever you mount userController)
const express = require('express');
const router = express.Router();
const uc = require('../controller/userController');

router.post('/register', uc.register);
router.post('/login',    uc.login);
router.post('/profile',   uc.profile);
router.post('/getAll', uc.getAll);
router.post('/update', uc.verifyToken, uc.updateProfile);
// optional: router.get('/', uc.getUserById) if you still want query-by-id

module.exports = router;
