import { digest } from './auth';
import { database } from './store';
export function playerAuthorized(req: Request, screen: string) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  const p = database()
    .prepare('SELECT token FROM players WHERE screen=?')
    .get(screen) as { token: string } | undefined;
  return !!token && !!p && digest(token) === p.token;
}
