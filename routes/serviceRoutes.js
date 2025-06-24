// routes/serviceRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controller/serviceController');

// GET    /api/services
router.post('/getAll',       ctrl.getAllServices);

// GET    /api/services/id/:serviceId
router.post('/serviceId', ctrl.getServiceById);

// GET    /api/services/name/:name
router.post('/getByname',    ctrl.getServiceByName);

module.exports = router;
