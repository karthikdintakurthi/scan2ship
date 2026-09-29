type Where = Record<string, any>;

/**
 * Evaluates the subset of Prisma `where` syntax used by the order policy and
 * routes (equality, `in`, `not`, `AND`, `OR`) against an in-memory row.
 */
export function matchesWhere(row: Record<string, unknown>, where: Where = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'AND') return (condition as Where[]).every((clause) => matchesWhere(row, clause));
    if (key === 'OR') return (condition as Where[]).some((clause) => matchesWhere(row, clause));

    const value = row[key];
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('in' in condition && !(condition.in as unknown[]).includes(value)) return false;
      if ('not' in condition && value === condition.not) return false;
      if ('equals' in condition) {
        const insensitive = condition.mode === 'insensitive';
        const normalize = (v: unknown) => (insensitive && typeof v === 'string' ? v.toLowerCase() : v);
        if (normalize(value) !== normalize(condition.equals)) return false;
      }
      return true;
    }
    return value === condition;
  });
}
