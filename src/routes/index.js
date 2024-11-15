const express = require('express');
const analyticsRoutes = require('./analytics.routes');
const adsRoutes = require('./ads.routes');
const salesRoutes = require('./sales.routes');
const emailRoutes = require('./email.routes');
const seoRoutes = require('./seo.routes');
const errorsRoutes = require('./errors.routes');
const configRoutes = require('./config.routes');
const chatRoutes = require('./chat.routes');
const performanceRoutes = require('./performance.routes');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ads', adsRoutes);
router.use('/sales', salesRoutes);
router.use('/email', emailRoutes);
router.use('/seo', seoRoutes);
router.use('/errors', errorsRoutes);
router.use('/config', configRoutes);
router.use('/chat', chatRoutes);
router.use('/performance', performanceRoutes);

module.exports = router;