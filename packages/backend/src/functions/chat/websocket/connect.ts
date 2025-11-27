import { APIGatewayProxyHandler } from 'aws-lambda';
import { wsSuccessResponse, wsErrorResponse } from '../../../lib/utils/response';
import { Logger } from '../../../lib/utils/logger';

const logger = new Logger('WsConnectFunction');

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;

    logger.info('WebSocket connection established', { connectionId });

    return wsSuccessResponse({ message: 'Connected' });
  } catch (error: any) {
    logger.error('WebSocket connection failed', error);
    return wsErrorResponse('Connection failed', 500);
  }
};
