// controllers/ServiceController.js
const Service = require('../model/service');

/**
 * Return all services
 * POST /api/services/all
 */
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find();
    return res.json(services);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Return a single service by serviceId
 * POST /api/services/id
 * Body: { serviceId: string }
 */
exports.getServiceById = async (req, res) => {
  const { serviceId } = req.body;
  if (!serviceId) {
    return res.status(400).json({ error: 'serviceId is required in request body' });
  }

  try {
    const svc = await Service.findOne({ serviceId });
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    return res.json(svc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Return a single service by name
 * POST /api/services/name
 * Body: { name: string }
 */
exports.getServiceByName = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required in request body' });
  }

  try {
    const svc = await Service.findOne({ name });
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    return res.json(svc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
