// 메모리에만 60초 보관. 프록시 전달 헤더는 TRUST_PROXY 설정으로 검증한다.
// Vercel에서는 함수가 받는 소켓 주소가 방문자 IP가 아니라 Vercel 프록시 주소일 수 있다.
// 그 경우 모든 방문자가 한 IP로 묶여 사이트 전체가 분당 한도에 걸리므로, Vercel이 붙이는 방문자 IP 헤더를 쓴다.
export function clientIp(req, onVercel = process.env.VERCEL === '1') {
  if (onVercel) {
    const fromVercel = req.headers['x-real-ip'] || String(req.headers['x-vercel-forwarded-for'] || '').split(',')[0].trim();
    if (fromVercel) return String(fromVercel);
  }
  return req.ip || req.socket.remoteAddress;
}
export function requestLimit({ limit = Number(process.env.RATE_LIMIT_PER_MIN) || 120, windowMs = 60000, clock = Date.now } = {}) {
  const clients = new Map();
  const timer = setInterval(() => {
    const now = clock();
    for (const [ip, timestamps] of clients) if (!timestamps.length || timestamps.at(-1) <= now - windowMs) clients.delete(ip);
  }, windowMs);
  timer.unref();
  return (req, res, next) => {
    const now = clock();
    const ip = clientIp(req);
    const times = (clients.get(ip) || []).filter((at) => at > now - windowMs);
    if (times.length >= limit || (!clients.has(ip) && clients.size >= 50000)) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(((times[0] || now) + windowMs - now) / 1000))));
      return res.status(429).json({ error: '요청이 많아요. 1분 뒤에 다시 시도해 주세요.' });
    }
    times.push(now); clients.set(ip, times);
    res.set('X-RateLimit-Limit', String(limit)); res.set('X-RateLimit-Remaining', String(limit - times.length));
    next();
  };
}
