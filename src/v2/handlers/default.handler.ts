//#region Imports

import util from 'util';
import { BinarySettings, SingleValueHeaders } from '../@types';
import {
  AdapterContract,
  AdapterRequest,
  FrameworkContract,
  Resolver,
  ResolverContract,
  ServerlessHandler,
} from '../contracts';
import {
  ILogger,
  isBinary,
  setCurrentInvoke,
  waitForStreamComplete,
} from '../core';
import { ServerlessResponse } from '../network';
import { BaseHandler } from './base/base.handler';

//#endregion

/**
 * The class that implements a default serverless handler consisting of a function with event, context and callback parameters respectively
 */
export class DefaultHandler<
  TApp = any,
  TEvent = any,
  TContext = any,
  TCallback = any,
  TResponse = any
> extends BaseHandler<TApp, TEvent, TContext, TCallback, TResponse> {
  //#region Public Methods

  /**
   * @inheritDoc
   */
  public getHandler(
    app: TApp,
    framework: FrameworkContract<TApp>,
    adapters: AdapterContract<TEvent, TContext, TResponse>[],
    resolverFactory: ResolverContract<TEvent, TContext, TCallback, TResponse>,
    binarySettings: BinarySettings,
    respondWithErrors: boolean,
    log: ILogger
  ): ServerlessHandler {
    return (event: TEvent, context: TContext, callback?: TCallback) => {
      this.onReceiveRequest(
        log,
        event,
        context,
        binarySettings,
        respondWithErrors
      );

      const adapter = this.getAdapterByEventAndContext(
        event,
        context,
        adapters,
        log
      );

      this.onResolveAdapter(log, adapter);

      setCurrentInvoke({ event, context });

      return new Promise((resolve, reject) => {
        const promise = {
          resolve,
          reject,
        };

        const resolver = resolverFactory.createResolver({
          event,
          context,
          callback,
          promise,
        });

        const forwardRequest = async () => {
          try {
            await this.forwardRequestToFramework(
              app,
              framework,
              event,
              context,
              resolver,
              adapter,
              binarySettings,
              log
            );
          } catch (error) {
            log.error(
              'SERVERLESS_ADAPTER:RESPOND_TO_EVENT_SOURCE_WITH_ERROR',
              error
            );

            adapter.onErrorWhileForwarding({
              resolver,
              respondWithErrors,
              error,
              event,
              log,
            });
          }
        };

        forwardRequest();
      });
    };
  }

  //#endregion

  //#region Hooks

  /**
   * The hook executed on receive a request, before the request is being processed
   *
   * @param log The instance of logger
   * @param event The event sent by serverless
   * @param context The context sent by serverless
   * @param binarySettings The binary settings
   * @param respondWithErrors Indicates whether the error stack should be included in the response or not
   */
  protected onReceiveRequest(
    log: ILogger,
    event: TEvent,
    context: TContext,
    binarySettings: BinarySettings,
    respondWithErrors: boolean
  ): void {
    log.debug('SERVERLESS_ADAPTER:PROXY', {
      event: util.inspect(event, { depth: null }),
      context: util.inspect(context, { depth: null }),
      binarySettings,
      respondWithErrors,
    });
  }

  /**
   * The hook executed after resolve the adapter that will be used to handle the request and response
   *
   * @param log The instance of logger
   * @param adapter The adapter resolved
   */
  protected onResolveAdapter(
    log: ILogger,
    adapter: AdapterContract<TEvent, TContext, TResponse>
  ): void {
    log.debug(
      'SERVERLESS_ADAPTER:RESOLVED_ADAPTER_NAME: ',
      adapter.getAdapterName()
    );
  }

  /**
   * The hook executed after resolves the request values that will be sent to the framework
   *
   * @param log The instance of logger
   * @param requestValues The request values returned by the adapter
   */
  protected onResolveRequestValues(
    log: ILogger,
    requestValues: AdapterRequest
  ): void {
    const body = requestValues.body?.toString();

    log.debug(
      'SERVERLESS_ADAPTER:FORWARD_REQUEST_TO_FRAMEWORK:REQUEST_VALUES',
      {
        requestValues: {
          ...requestValues,
          body,
        },
      }
    );
  }

  /**
   * The hook executed after handling the response sent by the framework
   *
   * @param log The instance of logger
   * @param response The response sent by the framework
   */
  protected onResolveForwardedResponseToFramework(
    log: ILogger,
    response: ServerlessResponse
  ): void {
    log.debug('SERVERLESS_ADAPTER:FORWARD_REQUEST_TO_FRAMEWORK:RESPONSE', {
      response,
    });
  }

  /**
   * The hook executed before sending response to the serverless
   *
   * @param log The instance of logger
   * @param statusCode The status code of the response
   * @param body The body of the response
   * @param headers The headers of the response
   * @param isBase64Encoded Indicates whether the response was encoded as binary or not
   */
  protected onForwardResponse(
    log: ILogger,
    statusCode: number,
    body: string,
    headers: SingleValueHeaders,
    isBase64Encoded: boolean
  ) {
    log.debug(
      'SERVERLESS_ADAPTER:FORWARD_RESPONSE:EVENT_SOURCE_RESPONSE_PARAMS',
      {
        statusCode,
        body,
        headers,
        isBase64Encoded,
      }
    );
  }

  /**
   * The hook executed before sending response to the serverless with response from adapter
   *
   * @param log The instance of logger
   * @param successResponse The success response resolved by the adapter
   * @param body The body of the response sent by the framework
   */
  protected onForwardResponseAdapterResponse(
    log: ILogger,
    successResponse: TResponse,
    body: string
  ) {
    log.debug('SERVERLESS_ADAPTER:FORWARD_RESPONSE:EVENT_SOURCE_RESPONSE', {
      successResponse: util.inspect(successResponse, { depth: null }),
      body,
    });
  }

  //#endregion

  //#region Protected Methods

  /**
   * The function to forward the event to the framework
   *
   * @param app The instance of the app (express, hapi, etc...)
   * @param framework The framework that will process requests
   * @param event The event sent by serverless
   * @param context The context sent by serverless
   * @param resolver The resolver
   * @param adapter The adapter resolved to this event
   * @param log The instance of logger
   * @param binarySettings The binary settings
   */
  public async forwardRequestToFramework(
    app: TApp,
    framework: FrameworkContract<TApp>,
    event: TEvent,
    context: TContext,
    resolver: Resolver<TResponse>,
    adapter: AdapterContract<TEvent, TContext, TResponse>,
    binarySettings: BinarySettings,
    log: ILogger
  ) {
    const requestValues = adapter.getRequest(event, context, log);

    this.onResolveRequestValues(log, requestValues);

    const [request, response] =
      await this.getServerlessRequestResponseFromAdapterRequest(requestValues);

    framework.sendRequest(app, request, response);

    await waitForStreamComplete(response);

    this.onResolveForwardedResponseToFramework(log, response);

    this.forwardResponse(
      event,
      response,
      resolver,
      adapter,
      binarySettings,
      log
    );

    return response;
  }

  /**
   * The function to forward the response back to the serverless
   *
   * @param event The event sent by serverless
   * @param response The response of the framework
   * @param resolver The resolver
   * @param adapter The adapter resolved to this event
   * @param binarySettings The binary settings
   * @param log The instance of logger
   */
  protected forwardResponse(
    event: TEvent,
    response: ServerlessResponse,
    resolver: Resolver<TResponse>,
    adapter: AdapterContract<TEvent, TContext, TResponse>,
    binarySettings: BinarySettings,
    log: ILogger
  ): void {
    const statusCode = response.statusCode;
    const headers = ServerlessResponse.headers(response);
    const isBase64Encoded = isBinary(headers, binarySettings);
    const encoding = isBase64Encoded ? 'base64' : 'utf8';
    const body = ServerlessResponse.body(response).toString(encoding);
    const logBody = isBase64Encoded ? '[BASE64_ENCODED]' : body;

    this.onForwardResponse(log, statusCode, logBody, headers, isBase64Encoded);

    const successResponse = adapter.getResponse({
      event,
      statusCode,
      body,
      headers,
      isBase64Encoded,
      response,
      log,
    });

    this.onForwardResponseAdapterResponse(log, successResponse, logBody);

    resolver.succeed(successResponse);
  }

  //#endregion
}
