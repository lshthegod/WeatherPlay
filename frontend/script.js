// Spotify Light Player - 통합 JS

// 1. 토큰 체크 및 콜백 처리
if (window.location.pathname === "/callback") {
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const access_token = query.get("access_token");

  if (access_token) {
    localStorage.setItem("spotify_token", access_token);
    window.location.href = "/";
  } else if (code) {
    fetch("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
      .then(res => {
        if (!res.ok) throw new Error("Token 요청 실패");
        return res.json();
      })
      .then(data => {
        localStorage.setItem("spotify_token", data.access_token);
        window.location.href = "/";
      })
      .catch(() => {
        document.body.textContent = "로그인 실패: token 요청 실패";
      });
  } else {
    document.body.textContent = "로그인 실패: code 또는 access_token 없음";
  }
}

// 메인 페이지에서 access_token 쿼리 파라미터가 있으면 localStorage에 저장
if (window.location.search.includes('access_token=')) {
  const params = new URLSearchParams(window.location.search);
  const access_token = params.get('access_token');
  if (access_token) {
    localStorage.setItem('spotify_token', access_token);
    // URL에서 access_token을 제거하고 새로고침
    window.location.replace(window.location.pathname);
  }
}

// 3. UI 요소 캐싱
const elements = {
  status: document.getElementById('status'),
  albumArt: document.getElementById('albumArt'),
  trackName: document.getElementById('trackName'),
  artistName: document.getElementById('artistName'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  rewindBtn: document.getElementById('rewindBtn'),
  fastForwardBtn: document.getElementById('fastForwardBtn'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.getElementById('progressFill'),
  progressHandle: document.getElementById('progressHandle'),
  currentTime: document.getElementById('currentTime'),
  totalTime: document.getElementById('totalTime'),
  volumeSlider: document.getElementById('volumeSlider'),
  volumeValue: document.getElementById('volumeValue'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  repeatBtn: document.getElementById('repeatBtn'),
  loadSongs: document.getElementById('loadSongs'),
  loginBtn: document.getElementById('loginBtn')
};

// 4. Spotify Player 및 상태 변수
let player;
let currentState = null;
let isPlaying = false;
let currentPosition = 0;
let duration = 0;

// 5. 시간 포맷 함수
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 6. 상태 업데이트 함수
function updatePlayerState(state) {
  if (!state) return;
  currentState = state;
  isPlaying = !state.paused;
  currentPosition = state.position;
  duration = state.duration;
  const track = state.track_window.current_track;
  // 트랙 정보 업데이트
  if (track) {
    elements.trackName.textContent = track.name;
    elements.artistName.textContent = track.artists.map(a => a.name).join(', ');
    if (track.album.images && track.album.images.length > 0) {
      elements.albumArt.style.backgroundImage = `url(${track.album.images[0].url})`;
      elements.albumArt.textContent = '';
      if (isPlaying) {
        elements.albumArt.classList.add('spinning');
      } else {
        elements.albumArt.classList.remove('spinning');
      }
    } else {
      elements.albumArt.style.backgroundImage = '';
      elements.albumArt.textContent = '🎵';
      elements.albumArt.classList.remove('spinning');
    }
  }
  // 재생/일시정지 버튼 업데이트
  if (isPlaying) {
    elements.playPauseBtn.innerHTML = `
      <svg class="icon-svg-32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <path d="M216,48V208a16,16,0,0,1-32,0V48a16,16,0,0,1,32,0ZM72,48V208a16,16,0,0,1-32,0V48A16,16,0,0,1,72,48Z"></path>
      </svg>
    `;
  } else {
    elements.playPauseBtn.innerHTML = `
      <svg class="icon-svg-32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
      </svg>
    `;
  }
  // 진행 바 업데이트
  const progress = duration > 0 ? (currentPosition / duration) * 100 : 0;
  elements.progressFill.style.width = `${progress}%`;
  elements.progressHandle.style.right = `${100 - progress}%`;
  elements.currentTime.textContent = formatTime(currentPosition);
  elements.totalTime.textContent = formatTime(duration);
  // 셔플/반복 상태 업데이트
  elements.shuffleBtn.classList.toggle('active', state.shuffle);
  elements.repeatBtn.classList.toggle('active', state.repeat_mode > 0);
}

// 7. 진행 바 실시간 업데이트
setInterval(() => {
  if (isPlaying && currentState) {
    currentPosition += 1000;
    const progress = duration > 0 ? (currentPosition / duration) * 100 : 0;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressHandle.style.right = `${100 - progress}%`;
    elements.currentTime.textContent = formatTime(currentPosition);
  }
}, 1000);

// 8. Spotify Web Playback SDK 준비 시 플레이어 초기화
if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
  window._spotifyPlayerInitialized = false;
  window.onSpotifyWebPlaybackSDKReady = () => {
    console.log('[SDK] Spotify Web Playback SDK Ready!');
    if (window._spotifyPlayerInitialized) {
      console.log('[SDK] 이미 플레이어가 초기화됨. 중복 생성 방지');
      return;
    }
    window._spotifyPlayerInitialized = true;
    const accessToken = localStorage.getItem("spotify_token");
    console.log('[SDK] 초기화 시 토큰:', accessToken);
    if (!accessToken) {
      console.log('[SDK] 토큰 없음, 플레이어 생성 안함');
      return;
    }
    document.querySelectorAll('.control-btn, .secondary-btn, #loadSongs').forEach(btn => { btn.disabled = false; });
    console.log('[SDK] 컨트롤 활성화');
    updateLoginUI();
    // 기존 플레이어 초기화 코드
    player = new Spotify.Player({
      name: 'Light Spotify Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.5
    });
    player.addListener('ready', ({ device_id }) => {
      console.log('[Player] ready, device_id:', device_id);
      window.deviceId = device_id;
      elements.status.textContent = '연결됨 ✅';
    });
    player.addListener('not_ready', ({ device_id }) => {
      console.log('[Player] not_ready, device_id:', device_id);
      elements.status.textContent = '연결 끊어짐 ❌';
    });
    player.addListener('player_state_changed', (state) => {
      console.log('[Player] state_changed:', state);
      updatePlayerState(state);
    });
    player.addListener('initialization_error', ({ message }) => {
      console.error('[Player] 초기화 오류:', message);
      elements.status.textContent = '초기화 오류 ❌';
    });
    player.addListener('authentication_error', ({ message }) => {
      console.error('[Player] 인증 오류:', message);
      elements.status.textContent = '인증 오류 ❌';
      localStorage.removeItem('spotify_token');
      window.location.href = '/login';
    });
    player.addListener('account_error', ({ message }) => {
      console.error('[Player] 계정 오류:', message);
      elements.status.textContent = '프리미엄 계정 필요 ❌';
    });
    // 컨트롤 이벤트들
    elements.playPauseBtn.onclick = () => player.togglePlay();
    elements.prevBtn.onclick = () => player.previousTrack();
    elements.nextBtn.onclick = () => player.nextTrack();
    elements.rewindBtn.onclick = () => {
      if (currentPosition >= 15000) player.seek(currentPosition - 15000);
      else player.seek(0);
    };
    elements.fastForwardBtn.onclick = () => {
      if (currentPosition + 15000 < duration) player.seek(currentPosition + 15000);
    };
    elements.volumeSlider.oninput = (e) => {
      const volume = e.target.value / 100;
      player.setVolume(volume);
      elements.volumeValue.textContent = `${e.target.value}%`;
    };
    elements.progressBar.onclick = (e) => {
      if (duration > 0) {
        const rect = elements.progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = clickX / rect.width;
        const newPosition = duration * progress;
        player.seek(Math.floor(newPosition));
      }
    };
    elements.shuffleBtn.onclick = async () => {
      if (!accessToken || !window.deviceId) return;
      try {
        await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${!currentState?.shuffle}&device_id=${window.deviceId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      } catch (e) { console.error('[Player] 셔플 오류:', e); }
    };
    elements.repeatBtn.onclick = async () => {
      if (!accessToken || !window.deviceId) {
        if (currentState) {
          currentState.repeat_mode = currentState.repeat_mode === 0 ? 1 : 0;
          elements.repeatBtn.classList.toggle('active', currentState.repeat_mode > 0);
        }
        return;
      }
      const nextRepeatMode = currentState?.repeat_mode === 0 ? 'context' : 'off';
      try {
        await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextRepeatMode}&device_id=${window.deviceId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      } catch (e) { console.error('[Player] 반복 오류:', e); }
    };
    elements.loadSongs.onclick = async function() {
      const originalHTML = elements.loadSongs.innerHTML;
      elements.loadSongs.innerHTML = '<div class="loading"></div>';
      elements.loadSongs.disabled = true;
      try {
        const location = await getCurrentLocation();
        const songs = await fetchSongsWithLocation(location);
        const songListDiv = document.getElementById('songList');
        if (songs && songs.length > 0) {
          elements.status.textContent = `${songs.length}곡이 추가되었습니다!`;
          if (songListDiv) {
            songListDiv.innerHTML = songs.map((song, idx) =>
              `<div>곡 ${idx + 1}: <a href='https://open.spotify.com/track/${song.id}' target='_blank'>${song.name} - ${song.artist}</a></div>`
            ).join('');
          }
          await playSongs(songs.map(song => song.id));
        } else {
          elements.status.textContent = '곡을 찾을 수 없음 ❌';
          if (songListDiv) songListDiv.innerHTML = '';
        }
      } catch (e) {
        elements.status.textContent = '위치/곡 불러오기 실패 ❌';
        const songListDiv = document.getElementById('songList');
        if (songListDiv) songListDiv.innerHTML = '';
        console.error('[Player] 곡 불러오기 실패:', e);
        try {
          const defaultSongs = await fetchSongs();
          if (defaultSongs && defaultSongs.length > 0) {
            await playSongs(defaultSongs.map(song => song.id));
            elements.status.textContent = '기본 곡 로드됨 🎵';
          }
        } catch (e2) { console.error('[Player] 기본 곡도 실패:', e2); }
      } finally {
        elements.loadSongs.innerHTML = originalHTML;
        elements.loadSongs.disabled = false;
      }
    };
    player.connect();
  };

  window.addEventListener("DOMContentLoaded", () => {
    const accessToken = localStorage.getItem("spotify_token");
    console.log('[DOMContentLoaded] 현재 토큰:', accessToken);
    if (!accessToken) {
      if (elements.status) elements.status.textContent = "로그인이 필요합니다.";
      document.querySelectorAll('.control-btn, .secondary-btn, #loadSongs').forEach(btn => { btn.disabled = true; });
      console.log('[DOMContentLoaded] 컨트롤 비활성화');
      if (elements.albumArt) elements.albumArt.style.backgroundImage = '';
      if (elements.trackName) elements.trackName.textContent = '트랙을 선택해주세요';
      if (elements.artistName) elements.artistName.textContent = '아티스트';
      const songListDiv = document.getElementById('songList');
      if (songListDiv) songListDiv.innerHTML = '';
      updateLoginUI();
      return;
    }
    document.querySelectorAll('.control-btn, .secondary-btn, #loadSongs').forEach(btn => { btn.disabled = false; });
    console.log('[DOMContentLoaded] 컨트롤 활성화');
    updateLoginUI();
  });
}

// 위치 정보 가져오기 함수
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    elements.status.textContent = '위치 확인 중... 📍';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
}

async function fetchSongsWithLocation(location) {
  const response = await fetch('/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude })
  });
  if (!response.ok) throw new Error('API 오류');
  return await response.json();
}

async function fetchSongs() {
  const response = await fetch('/songs');
  if (!response.ok) throw new Error('Failed to fetch songs');
  return await response.json();
}

async function playSongs(songs) {
  if (!window.deviceId) {
    console.error('[playSongs] Device ID is not available');
    return;
  }
  const accessToken = localStorage.getItem("spotify_token");
  const uris = songs.map(song => `spotify:track:${song}`);
  console.log('[playSongs] 재생 요청 uris:', uris);
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('[playSongs] Failed to play songs:', response.status, errText);
    } else {
      console.log('[playSongs] 재생 성공!');
    }
  } catch (e) {
    console.error('[playSongs] Error:', e);
  }
}

function updateLoginUI() {
  const accessToken = localStorage.getItem("spotify_token");
  console.log('[updateLoginUI] 현재 토큰:', accessToken);
  if (accessToken) {
    if (elements.status) elements.status.textContent = "로그인 완료! 🎉";
    if (elements.loginBtn) {
      elements.loginBtn.textContent = "로그아웃";
      elements.loginBtn.onclick = () => {
        console.log('[로그아웃] 토큰 삭제 및 새로고침');
        localStorage.removeItem("spotify_token");
        window.location.reload();
      };
    }
  } else {
    if (elements.status) elements.status.textContent = "로그인이 필요합니다.";
    if (elements.loginBtn) {
      elements.loginBtn.textContent = "로그인";
      elements.loginBtn.onclick = () => {
        console.log('[로그인] 로그인 버튼 클릭, /login 이동');
        window.location.href = "/login";
      };
    }
    // 로그아웃 시 곡 리스트도 비움
    const songListDiv = document.getElementById('songList');
    if (songListDiv) songListDiv.innerHTML = '';
  }
}