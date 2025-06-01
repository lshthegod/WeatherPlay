require("dotenv").config();
console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET);
console.log('API_KEY:', process.env.API_KEY);


const express = require("express");
const route = require("./router");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");


// JSON 파싱을 위한 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, "../frontend")));

// API 라우트
app.use("/", route); // API는 /api 경로로 분리

// 기본 라우트 설정
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// 서버 시작
app.listen(port, "0.0.0.0", () => {
  console.log(`서버가 http://localhost:${port} 에서 실행중입니다.`);
  console.log(`외부 접속 주소: http://172.24.148.26:${port}`);
  console.log('환경변수 체크:', {
    hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    hasApiKey: !!process.env.API_KEY,
    redirectUri: process.env.REDIRECT_URI
  });
});
