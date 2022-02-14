import { ALBEvent } from 'aws-lambda';

export function createAlbEvent(
  httpMethod: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): ALBEvent {
  return {
    requestContext: {
      elb: {
        targetGroupArn:
          'arn:aws:elasticloadbalancing:us-east-1:347971939225:targetgroup/aws-s-Targe-RJF5FKWHX6Y8/29425aed99131fd0',
      },
    },
    httpMethod,
    path,
    queryStringParameters: {
      cache: 'true',
    },
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'content-length': '',
      'content-type': '',
      host: 'aws-ser-alb-p9y7dvwm0r42-2135869912.us-east-1.elb.amazonaws.com',
      origin:
        'http://aws-ser-alb-p9y7dvwm0r42-2135869912.us-east-1.elb.amazonaws.com',
      pragma: 'no-cache',
      referer:
        'http://aws-ser-alb-p9y7dvwm0r42-2135869912.us-east-1.elb.amazonaws.com/',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
      'x-amzn-trace-id': 'Root=1-5cdf3407-76d73870a87c746001f27090',
      'x-forwarded-for': '72.21.198.66',
      'x-forwarded-port': '80',
      'x-forwarded-proto': 'http',
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
  };
}

export function createAlbEventWithMultiValueHeaders(
  httpMethod: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string[]>
): ALBEvent {
  return {
    requestContext: {
      elb: {
        targetGroupArn:
          'arn:aws:elasticloadbalancing:us-east-1:347971939225:targetgroup/aws-s-Targe-RJF5FKWHX6Y8/29425aed99131fd0',
      },
    },
    httpMethod,
    path,
    multiValueQueryStringParameters: {
      cache: ['true'],
    },
    multiValueHeaders: {
      accept: ['*/*'],
      'accept-encoding': ['gzip, deflate'],
      'accept-language': ['en-US,en;q=0.9'],
      'cache-control': ['no-cache'],
      connection: ['keep-alive'],
      'content-length': [],
      'content-type': [],
      host: ['aws-ser-alb-p9y7dvwm0r42-2135869912.us-east-1.elb.amazonaws.com'],
      origin: [
        'http://aws-ser-alb-p9y7dvwm0r42-2135869912.us-east-1.elb.amazonaws.com',
      ],
      pragma: ['no-cache'],
      referer: [
        'http://aws-ser-alb-p9y7dvwm0r42-2135869912.us-east-1.elb.amazonaws.com/',
      ],
      'user-agent': [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
      ],
      'x-amzn-trace-id': ['Root=1-5cdf3407-76d73870a87c746001f27090'],
      'x-forwarded-for': ['72.21.198.66'],
      'x-forwarded-port': ['80'],
      'x-forwarded-proto': ['http'],
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
  };
}
