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

  // 플레이리스트에서 현재 재생 중인 곡 표시
  const songListDiv = document.getElementById('songList');
  if (songListDiv && state && state.track_window && state.track_window.current_track) {
    const currentTrackId = state.track_window.current_track.id;
    // 이전에 활성화된 항목의 스타일 제거
    songListDiv.querySelectorAll('div').forEach(item => {
      item.classList.remove('current-track');
    });
    // 현재 트랙 ID와 일치하는 항목에 스타일 추가
    // a 태그의 href에서 track ID를 추출하여 비교
    const currentItem = Array.from(songListDiv.querySelectorAll('div a')).find(link => {
      const href = link.getAttribute('href');
      return href && href.includes(`/track/${currentTrackId}`);
    });
    if (currentItem) {
      currentItem.parentElement.classList.add('current-track');

      // 현재 재생 중인 곡의 제목과 아티스트로 플레이리스트 항목 텍스트 업데이트
      const spotifyTrack = state.track_window.current_track;
      if (spotifyTrack) {
         currentItem.textContent = `${currentItem.parentElement.textContent.split(':')[0]}: ${spotifyTrack.name} - ${spotifyTrack.artists.map(a => a.name).join(', ')}`;
      }
    }
  }
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
      if (state && state.track_window) {
        console.log('[Player] 현재 트랙:', state.track_window.current_track);
        console.log('[Player] 트랙 목록:', state.track_window.track_list);
      }
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
      const songListDiv = document.getElementById('songList');
      songListDiv.innerHTML = ''; // Clear previous list on load attempt

      try {
        let songs;
        try {
          const location = await getCurrentLocation();
          elements.status.textContent = '위치 기반 곡 불러오는 중... 🎵';
          songs = await fetchSongsWithLocation(location);
        } catch (locationError) {
          console.warn('[Player] 위치 정보 가져오기 실패, 기본 위치 사용:', locationError);
          elements.status.textContent = '기본 위치로 곡 불러오는 중... 🎵';
          songs = await fetchSongs();
        }

        if (songs && songs.length > 0) {
          elements.status.textContent = `${songs.length}곡이 추가되었습니다!`;
          console.log('[loadSongs] 받아온 노래 목록:', songs);
          if (songListDiv) {
            songListDiv.innerHTML = songs.map((song, idx) =>
              `<div>곡 ${idx + 1}: <a href='https://open.spotify.com/track/${song.id}' target='_blank'>${song.name} - ${song.artist}</a></div>`
            ).join('');
          }
          try {
            await playSongs(songs.map(song => song.id));
            console.log('[Player] playSongs 호출 성공');
          } catch (playError) {
            console.error('[Player] playSongs 호출 실패:', playError);
            elements.status.textContent = '곡 재생 시작 실패 ❌';
          }
        } else {
          elements.status.textContent = '곡을 찾을 수 없음 ❌';
          if (songListDiv) songListDiv.innerHTML = '';
        }
      } catch (e) {
        console.error('[Player] 곡 불러오기 실패 (General Error):', e);
        elements.status.textContent = '곡 불러오기 실패 ❌';
        if (songListDiv) songListDiv.innerHTML = '';
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
  console.log('[Geolocation] 위치 정보 가져오기 시도...');
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('[Geolocation] Geolocation API 지원되지 않음');
      reject(new Error('Geolocation is not supported'));
      return;
    }
    elements.status.textContent = '위치 확인 중... 📍';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[Geolocation] 위치 정보 가져오기 성공:', { latitude, longitude });
        resolve({ latitude, longitude });
      },
      (error) => {
        console.error('[Geolocation] 위치 정보 가져오기 실패:', error);
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
  try {
    const response = await fetch('/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchSongsWithLocation] API 오류 응답 텍스트:', errorText);
      throw new Error(`API 오류: ${response.status} - ${errorText}`);
    }
    const responseText = await response.text();
    console.log('[fetchSongsWithLocation] Raw API 응답 텍스트:', responseText);
    const data = JSON.parse(responseText);
    console.log('[fetchSongsWithLocation] API 응답 객체:', data);
    return data;
  } catch (e) {
    console.error('[fetchSongsWithLocation] 오류:', e);
    throw e; // Re-throw the error to be caught by the main handler
  }
}

async function fetchSongs() {
  try {
    const response = await fetch('/songs');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchSongs] API 오류 응답 텍스트:', errorText);
      throw new Error(`API 오류: ${response.status} - ${errorText}`);
    }
    const responseText = await response.text();
    console.log('[fetchSongs] Raw API 응답 텍스트:', responseText);
    const data = JSON.parse(responseText);
    console.log('[fetchSongs] API 응답 객체:', data);
    return data;
  } catch (e) {
    console.error('[fetchSongs] 오류:', e);
    throw e; // Re-throw the error to be caught by the main handler
  }
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
      throw new Error(`Spotify Playback API 오류: ${response.status} - ${errText}`);
    } else {
      console.log('[playSongs] 재생 성공!');
    }
  } catch (e) {
    console.error('[playSongs] Error:', e);
    throw e; // Re-throw the error to be caught by the main handler
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