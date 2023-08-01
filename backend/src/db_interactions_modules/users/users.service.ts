import { Injectable, Catch, ConflictException, UnauthorizedException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository, QueryFailedError } from 'typeorm';
import { Response } from 'express';
import { CreateUserDto } from './dtos/user.dto';
import { Socket, Server } from 'socket.io';
import { UserSocketArray } from './classes/UsersSockets';
import { getUserIDFromToken } from './getUserIDFromToken';
import { JwtService } from '@nestjs/jwt';
import { UserToChannelService } from '../relations/user_to_channel/user_to_channel.service';
import { UserToChannel } from '../relations/user_to_channel/user_to_channel.entity';
import { Channel } from '../channels/channel.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserToChannel)
    private readonly userToChannel: Repository<UserToChannel>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private jwtService: JwtService,
    private readonly userToChannelService: UserToChannelService,
    
  ) {
  }
  UsersOnline: UserSocketArray[] = []


  async createUser(User: CreateUserDto){
    try {
        const response = await this.userRepository.save({...User, creation_date : new Date(), last_joined_date : new Date(), lost_games: 0, won_games: 0, xp_total:0})
        return response
      } catch (error) {
        if (error instanceof QueryFailedError) {
          throw new ConflictException('Duplicate key value found.');
        }
      }
  }

  async findAll() {
    return await this.userRepository.find();
  }

   async findbyusername_(nick_:string, res: Response) {
   const resp= await this.userRepository.findOne({where: {
      nick: nick_
    }});
    console.log(resp)
    if(!resp)
      return res.status(404).json()
    else
      return res.status(200).json(resp);
    }
    
    async findByNick(nick_ :string) {
      if(!nick_)
        return null;
      const resp= await this.userRepository.findOne(
        {where: {nick: nick_}}
       );
       return resp;
     }
     
  async findByLogin(intra_nick_ :string) {
    if(!intra_nick_)
      return null;
    const resp= await this.userRepository.findOne(
      {where: {intra_nick: intra_nick_}}
     );
     return resp;
   }

  async leaderboardInfo()
  {
      const userWins = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .addSelect('user.intra_nick', 'name')
      .addSelect('user.xp_total', 'score')
      .groupBy('user.id')
      .orderBy("user.xp_total", "DESC")
      .getRawMany();
      return userWins;
  }

   async findById(id_to_search :number) {
  
    const resp= await this.userRepository.findOne(
      {where: {id: id_to_search}}
     );
     return resp;
   }

  
   async addUserToLobby(client: Socket, server: Server,ChannelList: string[]){
    const token = client.handshake.auth.token;
    let payload;
    try {
       payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: `${process.env.JWT_SECRET_KEY}`
        }
      );
    } catch {
      console.log("User Unhautorized")
      return null
    } 
    const resp = await this.userRepository.findOne({where: {id: payload.id}});
     if(!resp)
        return null
    const userChannels = await this.userToChannelService.findChannelsByID(resp.id);   
    userChannels.forEach((element) => {
     ChannelList.push(element.channel_id.id.toString())
    })
      this.UsersOnline.push(new UserSocketArray(resp,client))
      // let i=0;
      // this.UsersOnline.forEach((element) => {
      //   console.log(this.UsersOnline[i].user.id,this.UsersOnline[i].user.intra_nick,this.UsersOnline[i++].client.id)
      // })
     return true;
   }

   async notifyUser(user_id: number){
    //console.log(this.UsersOnline)
     console.log('Notification sent to user:', user_id);
    //  let i=0;
    //  this.UsersOnline.forEach((user) => {
    //   console.log(this.UsersOnline[i].user.id,this.UsersOnline[i].user.intra_nick,this.UsersOnline[i++].client.id)
    // })
     const user = this.UsersOnline.find( User_ => User_.user.id === user_id)
     if(!user)
       return;
     user.client.emit("notification")
   }

   async remove_disconnect_User(client_: Socket){
    const Index = this.UsersOnline.findIndex( User_ => User_.client === client_)
    if(Index != -1)
      this.UsersOnline.splice(Index,1)
    
    //   let i=0;
    //   this.UsersOnline.forEach((user) => {
    //    console.log(this.UsersOnline[i].user.id,this.UsersOnline[i].user.intra_nick,this.UsersOnline[i++].client.id)
    //  })  
   }

	 async uploadFile(file: string, user_id: number) {
		 const user = await this.findById(user_id);
		 user.avatar = file;
		 await this.userRepository.save(user);
	 }
}
