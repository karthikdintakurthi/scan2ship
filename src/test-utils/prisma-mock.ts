const WRITE_METHOD = /^(create|update|upsert|delete)/;

function defaultResult(method: string) {
  if (method === 'findMany' || method === 'groupBy') return [];
  if (method === 'count') return 0;
  return null;
}

/**
 * A Prisma client stand-in where every `model.method()` is a jest.fn that
 * resolves to an empty result. `prisma.users.findUnique` etc. can be
 * overridden per test; `writeCalls()` lists every create/update/upsert/delete.
 */
export function createPrismaMock() {
  const models = new Map<string, Record<string, jest.Mock>>();

  const model = (name: string) => {
    if (!models.has(name)) {
      const methods: Record<string, jest.Mock> = {};
      models.set(
        name,
        new Proxy(methods, {
          get: (target, method: string) => (target[method] ??= jest.fn(async () => defaultResult(method))),
        })
      );
    }
    return models.get(name)!;
  };

  const writeCalls = () =>
    [...models.entries()].flatMap(([modelName, methods]) =>
      Object.entries(methods)
        .filter(([method, fn]) => WRITE_METHOD.test(method) && fn.mock.calls.length > 0)
        .map(([method]) => `${modelName}.${method}`)
    );

  const client: any = new Proxy(
    {},
    {
      get: (_target, name) => {
        if (typeof name !== 'string' || name === 'then' || name === '__esModule') return undefined;
        if (name === 'writeCalls') return writeCalls;
        if (name === '$transaction') {
          return jest.fn(async (work: unknown) =>
            typeof work === 'function' ? work(client) : Promise.all(work as Promise<unknown>[])
          );
        }
        if (name.startsWith('$')) return jest.fn(async () => defaultResult(name));
        return model(name);
      },
    }
  );

  return client;
}
