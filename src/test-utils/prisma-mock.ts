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
          get: (target, method: string) =>
            (target[method] ??=
              name === 'sessions' && method === 'findUnique'
                ? // Authenticated test requests need a live session for their token
                  jest.fn(async (args) => require('./auth-request').liveSessionFor(args))
                : jest.fn(async () => defaultResult(method))),
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

  const clientMethods = new Map<string, jest.Mock>();
  const clientMethod = (name: string) => {
    if (!clientMethods.has(name)) {
      clientMethods.set(
        name,
        name === '$transaction'
          ? jest.fn(async (work: unknown) =>
              typeof work === 'function' ? work(client) : Promise.all(work as Promise<unknown>[])
            )
          : jest.fn(async () => defaultResult(name))
      );
    }
    return clientMethods.get(name)!;
  };

  const client: any = new Proxy(
    {},
    {
      get: (_target, name) => {
        if (typeof name !== 'string' || name === 'then' || name === '__esModule') return undefined;
        if (name === 'writeCalls') return writeCalls;
        if (name.startsWith('$')) return clientMethod(name);
        return model(name);
      },
    }
  );

  return client;
}
