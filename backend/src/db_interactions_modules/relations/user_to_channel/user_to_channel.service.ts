import { Injectable, Inject,forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToChannel } from './user_to_channel.entity';
import { CreateUserToChannDto } from './dtos/user_to_channel.dto';
import { User } from 'src/db_interactions_modules/users/user.entity';
import { Channel } from 'src/db_interactions_modules/channels/channel.entity';
import { Response } from 'express';
import { channel } from 'diagnostics_channel';
import { UsersService } from 'src/db_interactions_modules/users/users.service';
import { AppService } from 'src/app.service';

@Injectable()
export class UserToChannelService {
  constructor(
    @InjectRepository(UserToChannel) private UserToChannelRepository: Repository<UserToChannel>,
    @InjectRepository(Channel) private ChannelRepository: Repository<Channel> ,
    @InjectRepository(User) private UserRepository: Repository<User>,
    @Inject(forwardRef(() => UsersService))private usersService: UsersService,
    
  ) { }



  async joinchannel(channel: Channel, user: User, pass: string) {
    let is_user_owner = false;
    const channels_users_ = (await this.usersonchannel(channel.id))
    const is_already_on_channel= channels_users_.find(element => element.user_id.id == user.id )
    if(is_already_on_channel)      
      return
    const channels_users_count = (channels_users_).length
    if (!channels_users_count){
      is_user_owner = true;
    }
    if(channel.type == 2){
      const password =  await this.ChannelRepository.findOne({where:{id: channel.id}, select:{password: true}});
      if (password.password != pass)
        return
    }

    this.usersService.update_channels_on_list(user.id,channel.id)

    return await this.UserToChannelRepository.save({
      user_id: user,
      channel_id: channel,
      is_owner: is_user_owner,
      is_admin: is_user_owner,
      is_muted: false,
      is_banned: false,
    });
  }

  async leavechannel(id_us: number, id_ch: number) {
    const channel_to_leave = await this.UserToChannelRepository.find({
      where: {
        user_id: { id: id_us },
        channel_id: { id: id_ch }
      }
      ,
      relations: ['user_id', 'channel_id']
    });

    return await this.UserToChannelRepository.remove(channel_to_leave)
  }

  async usersonchannel(ch_id: number) {
    const usersInChannel = await this.UserToChannelRepository.find({
      where: { channel_id: { id: ch_id }},
     relations: ['user_id', 'channel_id'],
    });
    const filteredUsersInChannel = usersInChannel.filter(userInChannel => !userInChannel.is_banned);
    return filteredUsersInChannel;
  }
  
  async findChannelsByID(us_id:number){
    const channels = await this.UserToChannelRepository.find(
      {
        where: {user_id: {id: us_id}, is_banned : false},
        relations: {channel_id:true, user_id: true}
      }
    )
    return channels
  }

 async kick_from_channel(id_us: number, id_ch: number, caller_id: number, res: Response) {
  const caller_privileges= await this.UserToChannelRepository.findOne({ where:[{user_id:{id:caller_id},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
  const user_to_kick= await this.UserToChannelRepository.findOne({ where:[{user_id:{id:id_us},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
  if((caller_privileges.is_admin || caller_privileges.is_owner) && !user_to_kick.is_owner){
    const channel_to_leave = await this.UserToChannelRepository.find({
        where: {
          user_id: { id: id_us },
          channel_id: { id: id_ch }
        }
        ,
        relations: ['user_id', 'channel_id']
      });
  
      await this.UserToChannelRepository.remove(channel_to_leave)
      this.notifyRoom(id_ch);
      return res.status(200).json()

  }
  else{
    return res.status(403).json("USER NOT AUTHORIZED TO KICK")
  }
  }


  async ban_from_channel(id_us: number, id_ch: number, caller_id: number, res: Response){
    console.log(caller_id)
    const caller_privileges = await this.UserToChannelRepository.findOne({ where:[{user_id:{id:caller_id},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
    const user_to_ban = await this.UserToChannelRepository.findOne({ where:[{user_id:{id:id_us},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
    if((caller_privileges.is_admin || caller_privileges.is_owner) && !user_to_ban.is_owner){
      const channel_to_leave = await this.UserToChannelRepository.findOne({
        where: {
          user_id: { id: id_us },
          channel_id: { id: id_ch }
        }
        ,
        relations: ['user_id', 'channel_id']
      });
      await this.UserToChannelRepository.update(channel_to_leave, { is_banned: true })
      this.notifyRoom(id_ch);
      return res.status(200).json()
    }
    else{
      return res.status(403).json("USER NOT AUTHORIZED TO Ban")
    }
  }


  async mute_from_channel(id_us: number, id_ch: number, caller_id: number, res: Response){
    const caller_privileges = await this.UserToChannelRepository.findOne({ where:[{user_id:{id:caller_id},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
    const user_to_mute = await this.UserToChannelRepository.findOne({ where:[{user_id:{id:id_us},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
    if((caller_privileges.is_admin || caller_privileges.is_owner) && !user_to_mute.is_owner){
      const channel_to_leave = await this.UserToChannelRepository.findOne({
        where: {
          user_id: { id: id_us },
          channel_id: { id: id_ch }
        }
        ,
        relations: ['user_id', 'channel_id']
      });
      if(channel_to_leave.is_muted)
        await this.UserToChannelRepository.update(channel_to_leave, { is_muted: false })
      else
        await this.UserToChannelRepository.update(channel_to_leave, { is_muted: true })
      this.notifyRoom(id_ch);
      return res.status(200).json()
    }
    else{
      return res.status(403).json("USER NOT AUTHORIZED TO MUTE")
    }
  }


    async give_admin_to_user(id_us: number, id_ch: number, caller_id: number, res: Response, opt: string){
    const caller_privileges = await this.UserToChannelRepository.findOne({ where:[{user_id:{id:caller_id},channel_id:{id:id_ch}}], relations: ['channel_id','user_id']})
    if((caller_privileges.is_admin || caller_privileges.is_owner)){
      const channel_to_leave = await this.UserToChannelRepository.findOne({
        where: {
          user_id: { id: id_us },
          channel_id: { id: id_ch }
        }
        ,
        relations: ['user_id', 'channel_id']
      });
      let new_admin_value = false 
      if(opt == "give")
        new_admin_value= true
      await this.UserToChannelRepository.update(channel_to_leave, { is_admin: new_admin_value })
      this.notifyRoom(id_ch);
      return res.status(200).json()
    }
    else{
      return res.status(403).json("USER NOT AUTHORIZED TO GIVE ADMIN")
    }
  }

  async getBannedChannelList(id_us: number){
    return await this.UserToChannelRepository.find(
      {
        where: {user_id: {id: id_us}, is_banned : true},
        relations: {channel_id:true, user_id: true}
      }
    )
  }


    async privatemessage_channel(us_id: number, caller_id: number){
    const caller_user = await this.UserRepository.findOne({ where : {id: caller_id}});
    const user_to_chat = await this.UserRepository.findOne({ where : {id: us_id}});
    if(!caller_user || !user_to_chat)
      return;
     
    let user_lower_id = caller_user.id < user_to_chat.id ? caller_user : user_to_chat
    let user_higher_id =  user_lower_id == caller_user ? user_to_chat : caller_user
    const channel= await this.ChannelRepository.findOne({
      where: {type : 0,channel_name : user_lower_id.id.toString() + "-" + user_higher_id.id.toString()}
    })
    if(channel)
      return channel;
    const created_channel = await this.ChannelRepository.save({type: 0, channel_name: user_lower_id.id.toString() + "-" + user_higher_id.id.toString()})
    const joinchannels = await this.UserToChannelRepository.save({is_owner: false, is_admin: false, is_banned: false, is_muted:false, user_id: user_lower_id, channel_id: created_channel});
    const joinchannels2 = await this.UserToChannelRepository.save({is_owner: false, is_admin: false, is_banned: false, is_muted:false, user_id: user_higher_id, channel_id: created_channel});
    return created_channel;
  }

  async notifyRoom(ch_id: number){
    const Room = await this.ChannelRepository.findOne({ where : {id: ch_id}});
    const users = await this.usersonchannel(ch_id);
    users.forEach(element => {
      this.usersService.notifyUser(element.user_id.id,AppService.UsersOnline)
    });
  }
}