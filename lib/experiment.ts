export const DESIGN_COOKIE = 'adspace_design_v1';
export function assignedDesign(
  cookieHeader: string | null,
  randomByte: number,
): 'a' | 'b' {
  const values = (cookieHeader || '')
    .split(';')
    .map((v) => v.trim())
    .filter((v) => v.startsWith(DESIGN_COOKIE + '='))
    .map((v) => v.slice(DESIGN_COOKIE.length + 1));
  if (values.length === 1 && (values[0] === 'a' || values[0] === 'b'))
    return values[0];
  if (!Number.isInteger(randomByte) || randomByte < 0 || randomByte > 255)
    throw Error('Invalid entropy');
  return randomByte < 128 ? 'a' : 'b';
}
