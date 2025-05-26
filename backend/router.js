const express = require('express');
const router = express.Router();
const { mainController } = require('./controller');

router.post('/', mainController);
router.get('/', mainController); // test용

module.exports = router;