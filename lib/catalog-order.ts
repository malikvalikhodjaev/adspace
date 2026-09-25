export type CatalogCard<R, C> =
  | { kind: 'reference'; screen: R }
  | { kind: 'connected'; screen: C };

// Temporary display order until catalogue sorting is designed. Keep the
// source order within each operator, but alternate operators in the grid.
// Connected, bookable screens are interleaved without changing their order.
export function mixCatalogCards<R extends { supplier?: string }, C>(
  references: R[],
  connected: C[],
): CatalogCard<R, C>[] {
  const bySupplier = new Map<string, R[]>();
  for (const screen of references) {
    const supplier = screen.supplier || '7Media';
    const group = bySupplier.get(supplier) || [];
    group.push(screen);
    bySupplier.set(supplier, group);
  }

  const groups = [...bySupplier.values()].map((items) => ({ items, next: 0 }));
  const result: CatalogCard<R, C>[] = [];
  let remaining = references.length;
  let connectedIndex = 0;
  let referencesSinceConnected = 0;

  while (remaining > 0) {
    for (const group of groups) {
      if (group.next >= group.items.length) continue;
      result.push({ kind: 'reference', screen: group.items[group.next++] });
      remaining--;
      referencesSinceConnected++;
      if (referencesSinceConnected === 4 && connectedIndex < connected.length) {
        result.push({ kind: 'connected', screen: connected[connectedIndex++] });
        referencesSinceConnected = 0;
      }
    }
  }

  while (connectedIndex < connected.length) {
    result.push({ kind: 'connected', screen: connected[connectedIndex++] });
  }
  return result;
}
