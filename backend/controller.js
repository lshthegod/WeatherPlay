const { mainService } = require('./service');

async function mainController(req, res) {
    try {
        const { longitude, latitude } = req.body;
        if (!longitude || !latitude) {
            console.error('위도 또는 경도 값이 없습니다. default 위도 및 경로로 대체합니다.');
            const result = await mainService();
            return res.status(200).json(result);
        }
        const result = await mainService(longitude, latitude);
        return res.status(200).json(result);
    } catch (error) {
        console.error('날씨 API 호출 실패하였습니다. default 위도 및 경로로 대체합니다.');
        const result = await mainService();
        return res.status(200).json(result);
    }
}

module.exports = {
    mainController
}