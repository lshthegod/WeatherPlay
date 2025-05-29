require("dotenv").config();
const express = require("express");
const route = require("./router");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");

// 정적 파일 제공 (HTML, CSS, JS 파일들)
app.use(express.static(__dirname + "/frontend")); // 절대 경로로 설정

// JSON 파싱을 위한 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 라우트
app.use("/api", route); // API는 /api 경로로 분리

// 기본 라우트 설정
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// 서버 시작
app.listen(port, "0.0.0.0", () => {
  console.log(`서버가 http://localhost:${port} 에서 실행중입니다.`);
});
