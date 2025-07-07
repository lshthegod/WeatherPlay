const request = require("request");
const { parseString } = require("xml2js");
const dotenv = require("dotenv");
const axios = require("axios");
const querystring = require("querystring");

// v1 : 경도 v2 : 위도
function dfs_xy_conv(v1, v2) {
  const RE = 6371.00877; // Earth radius (km)
  const GRID = 5.0; // Grid spacing (km)
  const SLAT1 = 30.0; // 1st standard parallel
  const SLAT2 = 60.0; // 2nd standard parallel
  const OLON = 126.0; // origin longitude
  const OLAT = 38.0; // origin latitude
  const XO = 210 / GRID; // origin X grid coordinate
  const YO = 675 / GRID; // origin Y grid coordinate

  const DEGRAD = Math.PI / 180.0;
  const RADDEG = 180.0 / Math.PI;

  let re = RE / GRID;
  let slat1 = SLAT1 * DEGRAD;
  let slat2 = SLAT2 * DEGRAD;
  let olon = OLON * DEGRAD;
  let olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const lat = v2;
  const lon = v1;
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  let x = ra * Math.sin(theta) + XO + 1.5;
  let y = ro - ra * Math.cos(theta) + YO + 1.5;

  return {
    nx: Math.floor(x),
    ny: Math.floor(y),
  };
}

/**
 * nx, ny 격자 좌표로부터 초단기예보(fcstValue)만 뽑아
 * 객체를 resolve 하는 Promise 반환
 */
function getWeather(nx, ny) {
  const serviceKey =
    "wF1nqBiOKCfKIZKN2WIzmkzciFINwicZn0HarDmxpFogEIo7x2y8NM6F+W0wNDnLcWP4hRZi/tVS3P1u0kSWzA==";
  const url =
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

  // 관측 시각(base_time)은 "현재 시각 - 40분" 기준
  const now = new Date(Date.now() - 40 * 60 * 1000);
  const pad = (n) => (n < 10 ? "0" + n : n);
  const base_date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}`;
  const base_time = `${pad(now.getHours())}00`;

  const { nx: busanNx, ny: busanNy } = dfs_xy_conv(129.0756, 35.1796);

  // 쿼리스트링 조합
  const qs = [
    `serviceKey=${encodeURIComponent(serviceKey)}`,
    "pageNo=1", 
    "numOfRows=1000",
    "dataType=XML",
    `base_date=${base_date}`,
    `base_time=${base_time}`,
    `nx=${nx}`,
    `ny=${ny}`,
    `nx=${busanNx}`,
    `ny=${busanNy}`,
  ].join("&");

  return new Promise((resolve, reject) => {
    request(`${url}?${qs}`, { method: "GET" }, (err, res, body) => {
      if (err) return reject(err);
      if (res.statusCode !== 200)
        return reject(new Error(`API 에러: ${res.statusCode}`));

      // XML → JS 객체 파싱
      parseString(body, { explicitArray: false }, (e, json) => {
        if (e) return reject(e);

        // items 처리 (단일/배열 구분)
        const items = json.response.body.items.item;
        const arr = Array.isArray(items) ? items : [items];
        // category: obsrValue 맵 생성
        const result = {};
        arr.forEach((i) => {
          if (i.category && i.fcstValue != null) {
            result[i.category] = i.fcstValue;
          }
        });

        resolve(result);
      });
    });
  });
}

function getWeatherMood(weatherData) {
  const { RN1, SKY } = weatherData;
  const hour = new Date().getHours();

  // 시간대 처리
  const isDawn = hour >= 0 && hour < 6;
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 18;
  const isEvening = hour >= 18 && hour < 20;
  const isNight = hour >= 20 || hour < 6;

  let timeMood = "";
  if (isDawn) timeMood = "dawn";
  else if (isMorning) timeMood = "morning";
  else if (isAfternoon) timeMood = "afternoon";
  else if (isEvening) timeMood = "evening";
  else if (isNight) timeMood = "night";

  // rainMood 계산
  let rainMood = null;
  if (typeof RN1 === "string" && RN1.includes("없음")) {
    rainMood = null;
  } else if (RN1 === "0.0 mm") {
    rainMood = null;
  } else {
    const rainAmount = parseFloat(RN1);
    if (rainAmount >= 30.0) rainMood = "stormy";
    else if (rainAmount >= 4.0) rainMood = "rainy";
    else rainMood = null;
  }

  // skyMood 계산
  let skyMood = null;
  const skyVal = parseInt(SKY);
  if (skyVal >= 0 && skyVal <= 5) skyMood = "clear";
  else if (skyVal >= 6 && skyVal <= 8) skyMood = "cloudy";
  else if (skyVal >= 9 && skyVal <= 10) skyMood = "overcast";

  // 최종 반환 조건
  // if (rainMood) return rainMood;
  // if (skyMood === "clear") return timeMood;
  // return skyMood;

  return "stormy"
}

function getSongs(weather) {
  dotenv.config();
  const api_key = process.env.API_KEY;
  const url = `http://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${weather}&limit=100&api_key=${api_key}&format=json`;
  return new Promise((resolve, reject) => {
    request(url, { method: "GET" }, (err, res, body) => {
      if (err) return reject(err);
      if (res.statusCode !== 200)
        return reject(new Error(`API Error: ${res.statusCode}`));

      try {
        const data = JSON.parse(body);
        resolve(data);
      } catch (e) {
        reject(new Error(`Failed to parse JSON: ${e.message}`));
      }
    });
  });
}

function songsInfo(songs, count = 20) {
  const tracks = [...songs.tracks.track];

  // Fisher–Yates shuffle
  for (let i = tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  }

  // 앞에서 count개만 추출
  return tracks.slice(0, count).map((track) => ({
    name: track.name,
    artist: track.artist.name,
  }));
}

async function getAccessToken() {
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const authString = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  // console.log("SPOTIFY_CLIENT_ID:", process.env.SPOTIFY_CLIENT_ID);
  // console.log("SPOTIFY_CLIENT_SECRET:", process.env.SPOTIFY_CLIENT_SECRET);
  // console.log("API_KEY:", process.env.API_KEY);

  const res = await axios.post(tokenUrl, "grant_type=client_credentials", {
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return res.data.access_token;
}

async function getTrackId(songInfo) {
  const query = `${songInfo.name} ${songInfo.artist}`;
  const encodedQuery = encodeURIComponent(query);
  const accessToken = await getAccessToken();
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=1`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const items = response.data.tracks.items;
    if (items.length > 0) {
      return items[0].id;
    } else {
      throw new Error("No track found");
    }
  } catch (error) {
    console.error("Error fetching track ID:", error.message);
    throw error;
  }
}

async function getTrackIds(selectedSongs) {
  const ids = [];
  const failedSongs = [];
  
  for (const song of selectedSongs) {
    try {
      const id = await getTrackId(song);
      if (id) {
        ids.push(id);
      } else {
        failedSongs.push(song);
      }
    } catch (err) {
      console.error(`ID 가져오기 실패: ${song.name} by ${song.artist}`);
      failedSongs.push(song);
    }
  }

  if (failedSongs.length > 0) {
    console.warn(`${failedSongs.length}개의 곡에서 ID를 가져오지 못했습니다.`);
  }

  return ids;
}

async function mainService(x = 126.978, y = 37.5665) {
  try {
    const { nx, ny } = dfs_xy_conv(x, y);
    const weatherData = await getWeather(nx, ny);
    const weather = getWeatherMood(weatherData);
    const data = await getSongs(weather);
    const songs = songsInfo(data);
    
    if (!songs || songs.length === 0) {
      throw new Error('No songs found for the weather condition');
    }
    
    const IDs = await getTrackIds(songs);
    
    if (IDs.length === 0) {
      throw new Error('Failed to get any track IDs');
    }
    
    console.log(`${IDs.length}개의 곡 ID를 성공적으로 가져왔습니다.`);
    
    // songs와 IDs를 합쳐서 [{id, name, artist}] 형태로 반환
    const result = IDs.map((id, idx) => ({
      id,
      name: songs[idx]?.name || 'Unknown Track',
      artist: songs[idx]?.artist || 'Unknown Artist'
    }));
    
    return result;
  } catch (error) {
    console.error('Error in mainService:', error);
    throw error;
  }
}

// mainService();

module.exports = {
  mainService,
};
