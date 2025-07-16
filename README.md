# WeatherPlay

사용자의 위치와 실시간 날씨 정보를 바탕으로, 그 분위기에 어울리는 Spotify 음악을 추천·재생해주는 웹앱
## 기술 스택

**Frontend** : HTML + CSS + JS

**Backend** : Node.js + Express

**API** : 기상청 Open API, Spotify API, Lastfm API

## 주요 기능

**프론트엔드**

- **Spotify Light Player UI** 제공
- **위치 정보 및 날씨 기반 곡 추천** (브라우저 위치 권한 필요)
- 추천된 곡을 **Spotify Web Playback SDK**로 재생
- 기본 재생 컨트롤 제공: 재생 / 일시정지 / 이전 / 다음 / 셔플 / 반복 / 볼륨 조절
- 현재 날씨 및 상태 UI로 시각화

**백엔드**

- 사용자의 위도/경도 기반으로 기상청 초단기예보 API에서 날씨 정보 조회
- 날씨/시간대에 따라 분위기(mood) 태그 결정
- Last.fm API로 mood에 맞는 곡 리스트 추천
- Spotify API를 통해 곡의 Spotify 트랙 ID 매핑
- `/songs` 엔드포인트로 곡 리스트 및 ID 반환
- Spotify OAuth 인증 및 토큰 발급 지원

## **설치 및 실행 방법**

1. Node.js 18 이상 설치
2. 환경 변수 파일 설정 (`.env.example` 참고)
3. 백엔드 실행
    
    ```bash
    cd backend
    npm install
    npm start
    ```
    
    - 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.
4. ngrok 등으로 외부 URL 발급 후 Spotify Redirect URI 등록
    1. 예시 : https://happy.ngrok-free.app/callback
5. 프론트엔드 접속 → 로그인 → 위치 기반 곡 추천 및 재생
    1. 예시 : [https://happy.ngrok-free.app](https://happy.ngrok-free.xn--app-ky7m580d/)

## **프로젝트 출처 및 참고**

이 프로젝트는 **팀 프로젝트**로 진행된 결과물을 제 개인 레포지토리로 가져와 관리하고 있습니다.

원본 프로젝트는 아래를 참고해 주세요.

- [원본 레포지토리](https://github.com/Internet-Programming-Team-4/project)

## **기타**

- Spotify Premium 계정이 필요합니다.
- 위치 권한을 허용해야 날씨 기반 추천이 동작합니다.
- 기본적으로 모바일을 위한 환경입니다.