const { mainService } = require("./service");

async function mainController(req, res) {
  console.log("=== mainController 시작 ===");
  console.log("요청 메서드:", req.method);
  console.log("요청 데이터:", req.body);
  console.log("환경변수 체크:", {
    hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    hasApiKey: !!process.env.API_KEY,
  });

  try {
    let longitude, latitude;

    // POST 요청인 경우 body에서 위치 정보 추출
    if (req.method === "POST" && req.body) {
      longitude = req.body.longitude;
      latitude = req.body.latitude;
    }

    // 위치 정보가 없거나 유효하지 않은 경우 기본값 사용
    if (!longitude || !latitude) {
      console.log(
        "위도 또는 경도 값이 없습니다. 기본 위치(서울)로 대체합니다."
      );
      console.log("mainService 호출 전 (기본 위치)");
      const result = await mainService(); // 기본값: 서울 (126.978, 37.5665)
      console.log("mainService 호출 후, 결과 개수:", result?.length || 0);
      return res.status(200).json(result);
    }

    // 유효한 위치 정보가 있는 경우
    console.log(`mainService 호출 전 (위치: ${longitude}, ${latitude})`);
    const result = await mainService(longitude, latitude);
    console.log("mainService 호출 후, 결과 개수:", result?.length || 0);
    return res.status(200).json(result);
  } catch (error) {
    console.error("=== 에러 발생 ===");
    console.error("에러 내용:", error.message);
    console.error("에러 스택:", error.stack);

    // 에러 발생시 기본 위치로 fallback
    try {
      console.log("에러로 인해 기본 위치로 대체합니다.");
      const result = await mainService();
      console.log("Fallback 성공, 결과 개수:", result?.length || 0);
      return res.status(200).json(result);
    } catch (fallbackError) {
      console.error("Fallback도 실패:", fallbackError.message);
      return res.status(500).json({
        error: "음악 데이터를 가져오는데 실패했습니다.",
        details: fallbackError.message,
      });
    }
  }
}

module.exports = {
  mainController,
};
