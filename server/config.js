// .env 로더 — 외부 라이브러리 없이 server/.env(우선) 또는 루트 .env를 읽는다.
import { loadEnv } from './repo/system.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = __dirname;
export const ROOT_DIR = path.resolve(__dirname, '..');
loadEnv(path.join(SERVER_DIR, '.env'));
loadEnv(path.join(ROOT_DIR, '.env'));
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');

export const PORT = Number(process.env.PORT || 3000);
export const API_KEY = process.env.MMA_API_KEY || '';
// 기본은 직접 연결. 프록시 사용 시 운영자가 신뢰할 IP/CIDR을 명시한다.
export const TRUST_PROXY = process.env.TRUST_PROXY ? process.env.TRUST_PROXY.split(',').map((v) => v.trim()) : false;
export const MAIL = {
  provider: process.env.MAIL_PROVIDER || 'Resend',
  key: process.env.MAIL_KEY || '',
  from: process.env.MAIL_FROM || '',
};

// 검색 최적화 설정 — 도메인을 연결하면 SITE_URL을 꼭 바꾼다(canonical·sitemap에 쓰임).
export const SITE = {
  url: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  name: '입대타이밍',
  naverVerification: process.env.NAVER_SITE_VERIFICATION || '',
  googleVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  contactEmail: process.env.CONTACT_EMAIL || '',
};

// 수집기에서 쓰는 API 8개. url이 비어 있으면 sample로 대체한다.
const B = 'https://apis.data.go.kr/1300000';
// 요청주소 = 공공데이터포털 "서비스 URL" + 상세기능 경로. .env 값이 있으면 그걸 쓰고, 없으면 아래 기본값.
export const APIS = {
  status:    { id: '15031295', name: '모집병 군지원 접수현황',     url: process.env.MMA_URL_STATUS || `${B}/MJBGJWJeopSuHH4/list` },
  mos:       { id: '3066488',  name: '모집병 군사특기 정보',       url: process.env.MMA_URL_MOS || `${B}/gsTgMastr/list/gsTgMastr/list` },
  docs:      { id: '3066489',  name: '모집병 구비서류',            url: process.env.MMA_URL_DOCS || `${B}/gbSeoryu/list/gbSeoryu/list` },
  // 이 서비스는 공식 요청주소의 이중 슬래시가 필요하다. 단일 슬래시는 코드 12를 반환한다.
  score:     { id: '3066490',  name: '모집병 선발배점기준',        url: process.env.MMA_URL_SCORE || `${B}//bjGiJun/list/bjGiJun/list` },
  scoreSp:   { id: '3066491',  name: '모집병 전문특기병 배점구분', url: process.env.MMA_URL_SCORE_SP || `${B}/gbTgBaeJeom/list/gbTgBaeJeom/list` },
  eligible:  { id: '3066750',  name: '모집병 군별 특기별 지원가능 정보', url: process.env.MMA_URL_ELIGIBLE || `${B}/mjbJiWon/list` },
  jobfit:    { id: '15017227', name: '맞춤형 특기병 정보',         url: process.env.MMA_URL_JOBFIT || `${B}/MachumTG/list` },
  social:    { id: '3066757',  name: '사회복무요원 복무기관',      url: process.env.MMA_URL_SOCIAL || `${B}/bmggJeongBo/list` },
};
