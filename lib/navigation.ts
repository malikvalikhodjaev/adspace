import type { Role } from './model';

export function viewFromSearch(search: string, pathname = '/') {
  if (pathname === '/admin' || pathname === '/admin/') return 'admin';
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (view === 'calendar' || view === 'owner-calendar') return view;
  if (params.has('surface')) return 'catalog';
  if (view === 'orders') return 'campaigns';
  return view &&
    ['catalog', 'campaigns', 'operator', 'moderator', 'admin'].includes(view)
    ? view
    : 'home';
}

export function viewHref(view: string) {
  return view === 'home'
    ? '/'
    : view === 'admin'
      ? '/admin'
      : '/?view=' + (view === 'campaigns' ? 'orders' : view);
}

export function calendarHref(
  screen: string,
  owner = false,
  day?: string,
  back?: 'admin',
) {
  return (
    '/?view=' +
    (owner ? 'owner-calendar' : 'calendar') +
    '&screen=' +
    encodeURIComponent(screen) +
    (day ? '&day=' + encodeURIComponent(day) : '') +
    (back === 'admin' ? '&back=admin' : '')
  );
}

export function devshowHref(screen: string) {
  return '/devshow/' + encodeURIComponent(screen);
}

export function loginHref(role: 'advertiser' | 'operator', next?: string) {
  const params = new URLSearchParams({ role });
  if (next) params.set('next', next);
  return '/login?' + params.toString();
}

export function loginDestination(next: string | null, role: Role) {
  if (
    next?.startsWith('/') &&
    !next.startsWith('//') &&
    !/[\\\u0000-\u0020]/.test(next)
  ) {
    const parsed = new URL(next, 'https://adspace.local');
    const view = viewFromSearch(parsed.search, parsed.pathname);
    const allowed =
      ((view !== 'campaigns' && parsed.searchParams.get('resume') !== '1') ||
        role === 'advertiser' ||
        role === 'admin') &&
      (view !== 'operator' || role === 'operator' || role === 'admin') &&
      (!/^\/(display|devshow)\/[^/]+\/?$/.test(parsed.pathname) ||
        role === 'operator' ||
        role === 'admin') &&
      (view !== 'owner-calendar' || role === 'operator' || role === 'admin') &&
      (view !== 'moderator' || role === 'moderator' || role === 'admin') &&
      (view !== 'admin' || role === 'admin');
    if (parsed.origin === 'https://adspace.local' && allowed)
      return view === 'admin'
        ? '/admin'
        : parsed.pathname + parsed.search + parsed.hash;
  }
  return viewHref(
    role === 'operator'
      ? 'operator'
      : role === 'moderator'
        ? 'moderator'
        : role === 'admin'
          ? 'admin'
          : 'campaigns',
  );
}
