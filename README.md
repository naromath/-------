# 순천은행 농기계 판독 시스템

프론트엔드(Vite + React)와 Cloudflare Worker 프록시로 구성된 농기계 이미지 판독 서비스입니다.

## 구성

- 프론트엔드: `src/`
- API 프록시 Worker: `worker/`
- 프론트 배포: GitHub Pages (`.github/workflows/deploy.yml`)

## 1) 프론트 로컬 실행

1. 의존성 설치
   `npm install`
2. 환경변수 설정
   `.env` 또는 `.env.local`에 다음 추가
   `VITE_API_URL=/api`
3. 실행
   `npm run dev`

## 1-1) 외부에서 로컬 테스트 (간단 모드)

1. 터미널 A: Worker 실행
   `npm --prefix worker run dev`
2. 터미널 B: 프론트 실행
   `npm run dev`
3. 터미널 C: 프론트를 외부에 노출
   `cloudflared tunnel --url http://localhost:3000`
4. 출력된 `https://*.trycloudflare.com` 주소로 외부 기기에서 접속

이 모드에서는 프론트가 `/api`를 로컬 Worker로 프록시하므로 CORS 설정을 따로 건드릴 필요가 없습니다.

## 2) Worker 로컬 실행

1. Worker 의존성 설치
   `npm --prefix worker install`
2. `worker/.dev.vars` 생성
   `cp worker/.dev.vars.example worker/.dev.vars`
3. `worker/.dev.vars`에 값 입력
   - `GEMINI_API_KEY` 입력
4. 실행
   `npm --prefix worker run dev`

주의:
- 루트 `.env`의 `GEMINI_API_KEY`는 Worker(`wrangler dev`)가 자동으로 읽지 않습니다.
- 로컬 Worker는 반드시 `worker/.dev.vars` 또는 `wrangler secret put`로 값을 받아야 합니다.

`worker/wrangler.toml` 기본값:
- `GEMINI_MODEL=gemini-2.5-flash`

## 3) Worker 배포

`cd worker && npm run deploy`

배포 후 Worker URL을 프론트 환경변수로 반영하세요.
- 로컬: `.env`의 `VITE_API_URL`
- GitHub Actions: Repository Variables의 `VITE_API_URL`

## 4) GitHub Actions 설정

`deploy.yml`에서 Worker 자동 배포를 사용하려면 아래 Repository Secrets가 필요합니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GEMINI_API_KEY`

## 참고

- Worker는 `GEMINI_API_KEY` 단일 설정으로 동작합니다.
