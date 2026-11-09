// Local browser verification artifacts only; never used by the application.
import fs from 'node:fs';
import path from 'node:path';
export function saveDesignCheck(name, content) {
  if (!/^[a-z0-9.-]+$/i.test(name)) throw new Error('Invalid artifact name');
  const dir = path.resolve('.checks/ada');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), content);
}
