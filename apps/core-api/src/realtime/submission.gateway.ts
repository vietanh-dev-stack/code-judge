import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { EnvKeys, socketUserRoom, verifyAccessTokenCookie } from '../common';

type AnyRecord = Record<string, unknown>;

function parseFrontendOrigins(raw: string | undefined): string[] {
  return (raw ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

@WebSocketGateway({
  cors: (() => {
    const origins = parseFrontendOrigins(process.env.FRONTEND_URL);
    return {
      origin: origins.length === 1 ? origins[0] : origins,
      credentials: true,
      methods: ['GET', 'POST'],
    };
  })(),
})
export class SubmissionGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SubmissionGateway.name);

  constructor(private readonly config: ConfigService) {}

  afterInit(_server: Server) {
    this.logger.log('Socket.io initialized');
  }

  handleConnection(client: any) {
    const secret = this.config.get<string>(EnvKeys.JWT_SECRET);
    if (!secret) {
      this.logger.warn('JWT_SECRET missing — rejecting socket connection');
      client.disconnect(true);
      return;
    }

    const payload = verifyAccessTokenCookie(
      { headers: { cookie: client?.handshake?.headers?.cookie } },
      secret,
    );
    if (!payload) {
      this.logger.debug('Socket connection without valid accessToken cookie');
      client.disconnect(true);
      return;
    }

    const rawUserId = client?.handshake?.query?.userId ?? client?.handshake?.auth?.userId;
    const queryUserId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (queryUserId && queryUserId !== payload.sub) {
      this.logger.warn(`Socket userId mismatch: query=${queryUserId} token=${payload.sub}`);
      client.disconnect(true);
      return;
    }

    const userId = payload.sub;
    client.join(socketUserRoom(userId));
    client.data.userId = userId;
  }

  emitToUser(userId: string, event: string, payload: AnyRecord) {
    this.server.to(socketUserRoom(userId)).emit(event, payload);
  }

  emitToAll(event: string, payload: AnyRecord) {
    this.server.emit(event, payload);
  }

  @SubscribeMessage('client:hello')
  onHello(@ConnectedSocket() client: any, @MessageBody() _body: AnyRecord) {
    client.emit('client:hello:ack', { ok: true });
  }
}
