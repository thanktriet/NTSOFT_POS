import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected clients
  private connectedClients = new Map<string, { storeId: string; role: string }>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  // ===== Client joins a store room =====
  @SubscribeMessage('join:store')
  handleJoinStore(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { storeId: string; role: string },
  ) {
    client.join(`store:${data.storeId}`);
    this.connectedClients.set(client.id, data);
    console.log(`${client.id} joined store:${data.storeId} as ${data.role}`);
    return { event: 'joined', data: { storeId: data.storeId } };
  }

  // ===== Client joins a table room (customer) =====
  @SubscribeMessage('join:table')
  handleJoinTable(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { storeId: string; tableId: string },
  ) {
    client.join(`store:${data.storeId}`);
    client.join(`table:${data.tableId}`);
    console.log(`${client.id} joined table:${data.tableId}`);
    return { event: 'joined', data: { tableId: data.tableId } };
  }

  // ===== Emit events to store =====

  emitToStore(storeId: string, event: string, data: any) {
    this.server.to(`store:${storeId}`).emit(event, data);
  }

  emitToTable(tableId: string, event: string, data: any) {
    this.server.to(`table:${tableId}`).emit(event, data);
  }

  // ===== Order Events =====

  // New order created → notify staff + kitchen
  notifyOrderCreated(storeId: string, tableId: string, order: any) {
    this.emitToStore(storeId, 'order:created', order);
    this.emitToTable(tableId, 'order:created', order);
  }

  // Order status updated → notify all
  notifyOrderUpdated(storeId: string, tableId: string, order: any) {
    this.emitToStore(storeId, 'order:updated', order);
    this.emitToTable(tableId, 'order:updated', order);
  }

  // ===== Kitchen Events =====

  // Item status changed (FIFO updates)
  notifyItemStatusChanged(storeId: string, tableId: string, item: any) {
    this.emitToStore(storeId, 'item:status', item);
    this.emitToTable(tableId, 'item:status', item);
  }

  // ===== Table Events =====

  notifyTableUpdated(storeId: string, table: any) {
    this.emitToStore(storeId, 'table:updated', table);
  }

  // ===== Notification Events =====

  notifyNew(storeId: string, notification: any) {
    this.emitToStore(storeId, 'notification', notification);
  }

  // ===== Service Request (customer → staff) =====
  @SubscribeMessage('service:request')
  handleServiceRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { storeId: string; tableId: string; type: string; message?: string },
  ) {
    this.emitToStore(data.storeId, 'service:request', {
      tableId: data.tableId,
      type: data.type,
      message: data.message,
      timestamp: new Date(),
    });
    return { event: 'service:sent', data: { success: true } };
  }
}
