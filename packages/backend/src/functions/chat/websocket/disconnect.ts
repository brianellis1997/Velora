import { APIGatewayProxyHandler } from 'aws-lambda';
import { wsSuccessResponse, wsErrorResponse } from '../../../lib/utils/response';
import { Logger } from '../../../lib/utils/logger';

const logger = new Logger('WsDisconnectFunction');

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;

    logger.info('WebSocket disconnected', { connectionId });

    return wsSuccessResponse({ message: 'Disconnected' });
  } catch (error: any) {
    logger.error('WebSocket disconnect failed', error);
    return wsErrorResponse('Disconnect failed', 500);
  }
};
