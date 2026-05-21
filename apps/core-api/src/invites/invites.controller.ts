import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateClassInviteDto } from './dto/create-class-invite.dto';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('classroom/:classRoomId')
  inviteToClass(
    @Param('classRoomId') classRoomId: string,
    @Body() dto: CreateClassInviteDto,
    @CurrentUser() user: any,
  ) {
    return this.invitesService.inviteToClass(classRoomId, dto, user.userId);
  }

  @Get('accept')
  acceptInvite(@Query('token') token: string, @CurrentUser() user: any) {
    return this.invitesService.acceptInvite(token, user.userId);
  }
}