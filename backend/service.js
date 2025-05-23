const request = require('request');
const { parseString } = require('xml2js');
const dotenv = require('dotenv');
const axios = require('axios');

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

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;

    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);

    const lat = v2;
    const lon = v1;
    let ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    let x = ra * Math.sin(theta) + XO + 1.5;
    let y = ro - ra * Math.cos(theta) + YO + 1.5;

    return {
        nx: Math.floor(x),
        ny: Math.floor(y)
    };
}

/**
 * nx, ny 격자 좌표로부터 초단기예보(fcstValue)만 뽑아
 * 객체를 resolve 하는 Promise 반환
 */
function getWeather(nx, ny) {
  const serviceKey = 'wF1nqBiOKCfKIZKN2WIzmkzciFINwicZn0HarDmxpFogEIo7x2y8NM6F+W0wNDnLcWP4hRZi/tVS3P1u0kSWzA==';
  const url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst';

  // 관측 시각(base_time)은 "현재 시각 - 40분" 기준
  const now = new Date(Date.now() - 40 * 60 * 1000);
  const pad = n => n < 10 ? '0' + n : n;
  const base_date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const base_time = `${pad(now.getHours())}00`;

  // 쿼리스트링 조합
  const qs = [
    `serviceKey=${encodeURIComponent(serviceKey)}`,
    'pageNo=1',
    'numOfRows=1000',
    'dataType=XML',
    `base_date=${base_date}`,
    `base_time=${base_time}`,
    `nx=${nx}`,
    `ny=${ny}`
  ].join('&');

  return new Promise((resolve, reject) => {
    request(`${url}?${qs}`, { method: 'GET' }, (err, res, body) => {
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
        arr.forEach(i => {
          if (i.category && i.fcstValue != null) {
            result[i.category] = i.fcstValue;
          }
        });

        resolve(result);
      });
    });
  });
}

module.exports = {
  dfs_xy_conv,
  getWeather,
};

function getSongs(weather) {
  dotenv.config();
  const api_key = process.env.API_KEY;
  const url = `http://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${weather}&api_key=${api_key}&format=json`;
  return new Promise((resolve, reject) => {
    request(url, { method: 'GET' }, (err, res, body) => {
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

function getSong(songs) {
  const tracks = songs.tracks.track;
  const randomIndex = Math.floor(Math.random() * tracks.length); // 0~49
  const track = tracks[randomIndex];

  return {
    name: track.name,
    artist: track.artist.name
  };
}

async function getAccessToken() {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const authString = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const res = await axios.post(tokenUrl, 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return res.data.access_token;
}

async function main() {

  // 날씨 테스트
  const { nx, ny } = dfs_xy_conv(126.978, 37.5665);
  const weatherData = await getWeather(nx, ny);
  console.log(weatherData);

  // 음악 테스트
  const data = await getSongs("cloudy");
  const song = getSong(data);
  console.log(song);

  // spotify access token
  const token = await getAccessToken();
  console.log(token);
}

main();