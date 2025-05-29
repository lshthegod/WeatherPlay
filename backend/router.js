const express = require("express");
const { mainService } = require("./service");
const { mainController } = require("./controller");
const axios = require("axios");
const router = express.Router();

// POST 엔드포인트 - 위치 정보와 함께 곡 요청
router.post("/songs", mainController);

// GET 엔드포인트 - 기본 위치로 곡 요청 (fallback)
router.get("/songs", async (req, res) => {
  try {
    console.log("=== GET /songs 호출 (기본 위치 사용) ===");
    const songs = await mainService(); // 기본 위치 (서울) 사용
    res.status(200).json(songs);
  } catch (error) {
    console.error("Error fetching songs:", error);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

module.exports = router;
