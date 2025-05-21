const { getWeather, dfs_xy_conv } = require('./service');

function weatherController(req, res) {
    try {
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: '위도 또는 경도 값이 없습니다.' });
        }
        const { nx, ny } = dfs_xy_conv(longitude, latitude);
        getWeather(nx, ny)
            // 일단은 데이터 출력, 이후의 로직에 맞춰 수정 필요
            .then(data => console.log(data))
            .catch(err => console.error(err));
    } catch (error) {
        console.error('날씨 API 호출 실패:', error.message);
        res.status(500).json({ error: '날씨 정보 조회 실패' });
    }
}

module.exports = {
  weatherController
}