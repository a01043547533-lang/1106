// 메모리에만 60초 보관. 프록시 전달 헤더는 TRUST_PROXY 설정으로 검증한다.
export function requestLimit({ limit = 60, windowMs = 60000, clock = Date.now } = {}) {
  const clients = new Map();
  const timer = setInterval(() => {
    const now = clock();
    for (const [ip, timestamps] of clients) if (!timestamps.length || timestamps.at(-1) <= now - windowMs) clients.delete(ip);
  }, windowMs);
  timer.unref();
  return (req, res, next) => {
    const now = clock();
    const ip = req.ip || req.socket.remoteAddress;
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
