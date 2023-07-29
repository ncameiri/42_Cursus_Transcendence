import {
SubscribeMessage,
WebSocketGateway,
OnGatewayInit,
WebSocketServer,
OnGatewayConnection,
OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Socket, Server } from 'socket.io';
import { AppService } from '../../app.service';
import { CreateMsgDto } from '../messages/dtos/message.dto';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { GameService } from '../game/game.service';
import { PlayerPaddle } from '../game/classes/PlayerPaddle';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
 })
 export class AppGateway
 implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
 constructor(private appService: AppService, private gameService: GameService) {}
 
 @WebSocketServer() server: Server;
 
 @SubscribeMessage('sendMessage')
 @UsePipes(new ValidationPipe())
 async handleSendMessage(client: Socket, payload: CreateMsgDto): Promise<void> {
  console.log(new Date(),payload)
   await this.appService.createMessage(payload);
   this.server.emit('recMessage', payload);
 }
 
 afterInit(server: Server) {
  this.gameService.UpdateAllPositions()
 }
 
 handleDisconnect(client: Socket) {
   console.log(`Disconnected: ${client.id}`);
 }
 
 handleConnection(client: Socket, ...args: any[]) {
   console.log(`Connected ${client.id}`);
 }

// Game Service
  @SubscribeMessage('PlayerSelectedPaddle')
  handlePlayerSelectedPaddle(client: Socket, info: any) {
    let [intra_nick, paddleSkin] = info;
    this.gameService.CreatePlayer(client, intra_nick, paddleSkin);
    client.emit("PlayerCreated")
  }

  @SubscribeMessage('AddToLobby')
  handlAddPlayerToLobby(client: Socket, intra_nick: string) {
    console.log("Joined lobby"+intra_nick)
    this.gameService.AddPlayerToLobby(client, intra_nick)
  }
  @SubscribeMessage('PlayerReady')
  handlePlayerReady(client: Socket, intra_nick: string) {
    console.log("New Player ready "+intra_nick)
    this.gameService.PlayerReady(intra_nick)
  }
  @SubscribeMessage('keydown')
  handlePlayerKeyDown(client: Socket, key: string)
  {
    this.gameService.PlayerKeyDown(client, key)
  }
  @SubscribeMessage('keyup')
  handlePlayerKeyUp(client: Socket, key: string)
  {
    this.gameService.PlayerKeyUp(client, key)
  }
}
