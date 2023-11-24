import { Injectable, OnModuleInit, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITokensResponse } from 'src/app.interfaces';
import { HttpService } from '@nestjs/axios';
import { RefreshToken } from './schemas/refresh-token.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

type IAccessToken = { token: string; date: number; expires_in: number };

@Injectable()
export class TokensService implements OnModuleInit {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  private accessToken: IAccessToken;

  public get axiosConfig(): AxiosRequestConfig {
    return { headers: { Authorization: `Bearer ${this.accessToken?.token}` } };
  }

  async onModuleInit() {
    try {
      const refreshToken = await this.refreshTokenModel.findOne();
      const isRefreshTokenExpired =
        Date.now() - refreshToken.date.getTime() >= 7889400000;
      if (refreshToken && !isRefreshTokenExpired) {
        if (!this.accessToken) return await this.refreshTokens();
        return;
      }

      const {
        data: { refresh_token, access_token, expires_in },
      } = await firstValueFrom(
        this.httpService.post<ITokensResponse>(
          this.configService.get<string>('AMO_LINK') + '/oauth2/access_token/',
          {
            client_id: this.configService.get<string>('INTEGRATION_ID'),
            client_secret: this.configService.get<string>('SECRET_KEY'),
            grant_type: 'authorization_code',
            code: this.configService.get<string>('AMO_CODE'),
            redirect_uri: this.configService.get<string>('REDIRECT_URI'),
          },
        ),
      );

      await this.refreshTokenModel.findOneAndUpdate(
        {},
        { $set: { token: refresh_token, date: Date.now() } },
        { upsert: true },
      );

      this.accessToken = { token: access_token, date: Date.now(), expires_in };
      console.log(this.accessToken);
    } catch (error) {
      console.log('getRefreshTokenError:', error);
      throw error;
    }
  }

  public async checkTokensAndRefresh() {
    const isAccessTokenInspired =
      this.accessToken?.token &&
      Date.now() - this.accessToken.date >= this.accessToken.expires_in;
    if (!this.accessToken || !isAccessTokenInspired)
      return this.refreshTokens();
  }

  public async refreshTokens() {
    try {
      const { token } = await this.refreshTokenModel.findOne().lean();

      if (!token) throw new HttpException('Need refresh token', 403);

      const {
        data: { access_token, refresh_token, expires_in },
      } = await firstValueFrom(
        this.httpService.post<ITokensResponse>(
          this.configService.get('AMO_LINK') + '/oauth2/access_token',
          {
            client_id: this.configService.get<string>('INTEGRATION_ID'),
            client_secret: this.configService.get<string>('SECRET_KEY'),
            grant_type: 'refresh_token',
            refresh_token: token,
            redirect_uri: this.configService.get<string>('REDIRECT_URI'),
          },
        ),
      );
      this.accessToken = {
        token: access_token,
        date: Date.now(),
        expires_in,
      };

      await this.refreshTokenModel.findOneAndUpdate(
        {},
        { $set: { token: refresh_token, date: Date.now() } },
        { upsert: true },
      );
    } catch (error) {
      console.log('getRefreshTokenError:', error);
      throw error;
    }
  }
}
