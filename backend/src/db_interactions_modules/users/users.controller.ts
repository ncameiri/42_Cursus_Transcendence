import { Controller,UseGuards, Get, Post, Body, Patch, Param, Delete, Res, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express'
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/user.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/createuser')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

	// @Post('/file_upload/:id')
	// uploadFile(@Body() newFile: string, @Param('id') id: number) {
	// 	return this.usersService.uploadFile(newFile, id);
	// }
  
	@Post('/file_upload')
		@UseInterceptors(FileInterceptor('file'))
		uploadFile(@UploadedFile() file: Express.Multer.File) {
			console.log("YOYOYO");
			console.log(file);
			return {
				status: 'success',
				message: 'File has been uploaded successfully'
			};
	}
	

  @Get('/getUsers')
  findAll(@Req() req: any) {
    return this.usersService.findAll();
  }

  @Get('/getUsers/:nick')
  findbyusername(@Param('nick') nick_: string, @Res() res) {
    return this.usersService.findbyusername_(nick_, res);
  }

  @Get('leaderboard')
  findLeaderboardInfo() {
    return this.usersService.leaderboardInfo();
  }



/* 

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }*/
}
