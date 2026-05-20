import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { socketUserRoom } from '../common';

type AnyRecord = Record<string, unknown>;

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class SubmissionGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SubmissionGateway.name);

  afterInit(_server: Server) {
    this.logger.log('Socket.io initialized');
  }

  handleConnection(client: any) {
    const rawUserId = client?.handshake?.query?.userId ?? client?.handshake?.auth?.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId || typeof userId !== 'string') return;

    client.join(`user:${userId}`);
    client.data.userId = userId;
  }

  /**
   * Emit to a specific user room.
   * Room: `user:<userId>`
   */
  emitToUser(userId: string, event: string, payload: AnyRecord) {
    this.server.to(socketUserRoom(userId)).emit(event, payload);
  }

  /**
   * Broadcast to all connected clients.
   */
  emitToAll(event: string, payload: AnyRecord) {
    this.server.emit(event, payload);
  }

  // Optional helper to let frontend "ping" or validate connection.
  @SubscribeMessage('client:hello')
  onHello(@ConnectedSocket() client: any, @MessageBody() _body: AnyRecord) {
    client.emit('client:hello:ack', { ok: true });
  }
}
