const express = require('express');
const router = express.Router();
const { weatherController } = require('./controller');

router.post('/', weatherController);
router.get('/', (req, res) => {
    // 프론트 화면을 전송할 예정
    res.send('Hello World');
});

module.exports = router;