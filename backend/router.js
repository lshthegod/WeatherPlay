const express = require("express");
const { mainService } = require("./service");
const { mainController } = require("./controller");
const axios = require("axios");
const router = express.Router();
const querystring = require("querystring");

// POST 엔드포인트 - 위치 정보와 함께 곡 요청
router.post("/songs", async (req, res) => {
  try {
    console.log("=== POST /songs 호출 (위치 정보 사용) ===");
    const { latitude, longitude } = req.body;
    // mainService는 { weather, songs } 형태의 객체를 반환
    const result = await mainService(longitude, latitude); // 경도, 위도 순서로 전달
    // 곡 목록만 추출하여 응답
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching songs with location:", error);
    res.status(500).json({ error: "Failed to fetch songs with location" });
  }
});

// GET 엔드포인트 - 기본 위치로 곡 요청 (fallback)
router.get("/songs", async (req, res) => {
  try {
    console.log("=== GET /songs 호출 (기본 위치 사용) ===");
    // mainService는 { weather, songs } 형태의 객체를 반환
    const result = await mainService(); // 기본 위치 (서울) 사용
     // 곡 목록만 추출하여 응답
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching songs:", error);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Spotify login redirection endpoint
router.get("/login", (req, res) => {
  const redirect_uri = process.env.REDIRECT_URI;
  console.log("redirect_uri 확인:", redirect_uri);
  
  const params = querystring.stringify({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: "user-read-private user-read-email streaming",
    redirect_uri,
  });

  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params}`;
  res.redirect(spotifyAuthUrl);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const redirect_uri = process.env.REDIRECT_URI;

  if (!code) {
    return res.send("로그인 실패: code 없음");
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_CLIENT_ID +
                ":" +
                process.env.SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    res.redirect(`/?access_token=${access_token}`);
  } catch (error) {
    console.error("토큰 요청 실패:", error.response?.data || error.message);
    res.send("로그인 실패: 토큰 요청 실패");
  }
});

module.exports = router;