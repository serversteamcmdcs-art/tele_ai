import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import type { ServerEvent } from '@teleai/shared';
export declare function getConnections(): Map<string, Set<WebSocket>>;
export declare function sendToUser(userId: string, event: ServerEvent): void;
export declare function sendToChat(chatId: string, event: ServerEvent, excludeUserId?: string): void;
export declare function setupWebSocket(app: FastifyInstance): void;
//# sourceMappingURL=handler.d.ts.map