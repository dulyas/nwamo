import { Controller, Get, Query, HttpException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/user')
  async createLeadWithUserWithData(
    @Query('name') name: string,
    @Query('email') email: string,
    @Query('phone') phone: string,
  ) {
    if (!name || !email || !phone)
      throw new HttpException(
        'All queries (name, email, phone) are required!',
        400,
      );

    return this.appService.createLeadWithUserWithData(name, email, phone);
  }
}
