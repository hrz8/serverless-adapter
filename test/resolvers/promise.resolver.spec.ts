import { beforeEach, describe, expect, it, vitest } from 'vitest';
import type { Context } from 'aws-lambda';
import {
  AdapterContract,
  ILogger,
  OnErrorProps,
  ResolverProps,
} from '../../src';
import { PromiseResolver } from '../../src/resolvers/promise';

describe(PromiseResolver.name, () => {
  let resolverFactory!: PromiseResolver<
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  let mockedContext!: Context;
  let mockedLogger!: ILogger;
  let mockedAdapter!: AdapterContract<unknown, unknown, unknown>;

  beforeEach(() => {
    resolverFactory = new PromiseResolver();

    mockedContext = {
      succeed: vitest.fn(),
      fail: vitest.fn(),
    } as unknown as Context;

    mockedLogger = {
      error: vitest.fn(),
    } as unknown as ILogger;

    mockedAdapter = {
      onErrorWhileForwarding: vitest.fn(
        ({
          error,
          delegatedResolver,
          respondWithErrors,
          log,
          event,
        }: OnErrorProps<any, any>) => {
          expect(error).toBeInstanceOf(Error);
          expect(delegatedResolver).toHaveProperty('succeed');
          expect(delegatedResolver).toHaveProperty('fail');
          expect(typeof respondWithErrors).toBe('boolean');
          expect(log).toBe(mockedLogger);
          expect(event).toBeDefined();

          delegatedResolver.fail(error);
        },
      ),
    } as unknown as AdapterContract<any, any, any>;
  });

  it('should call correctly the promise when succeed', async () => {
    const resolverProps: ResolverProps<any, any, Context, any> = {
      log: mockedLogger,
      respondWithErrors: false,
      event: {},
      adapter: mockedAdapter,
    };

    const resolver = resolverFactory.createResolver(resolverProps);

    const result = await resolver.run(() => Promise.resolve(true));

    expect(result).toBe(true);
  });

  it('should call correctly the promise when fail', async () => {
    const resolverProps: ResolverProps<any, any, Context, any> = {
      log: mockedLogger,
      respondWithErrors: false,
      context: mockedContext,
      event: {},
      adapter: mockedAdapter,
    };

    const error = new Error('error on test');

    const resolver = resolverFactory.createResolver(resolverProps);

    await expect(resolver.run(() => Promise.reject(error))).rejects.toBe(error);

    expect(resolverProps.log.error).toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(resolverProps.adapter.onErrorWhileForwarding).toHaveBeenCalled();
  });
});
