import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { TokensService } from './services/tokens/tokens.service';
import { IContact, IContactResponse } from './app.interfaces';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tokensService: TokensService,
  ) {}

  amoLink: string = this.configService.get<string>('AMO_LINK');

  public async createLeadWithUserWithData(
    name: string,
    email: string,
    phone: string,
    isRetry = false,
  ) {
    await this.tokensService.checkTokensAndRefresh();

    try {
      const updateContact = await this.updateOrCreateContact(
        name,
        email,
        phone,
      );
      const { data: lead } = await this.createLeadWithContact(updateContact);
      return lead;
    } catch (error) {
      if (isAxiosError(error)) {
        const errorData = error.response.data;
        if (errorData?.status === 401 && !isRetry) {
          await this.tokensService.refreshTokens();
          return await this.createLeadWithUserWithData(
            name,
            email,
            phone,
            true,
          );
        }
      }
      console.log(error?.response?.data?.['validation-errors']?.[0]?.errors);
      throw error;
    }
  }

  private addContact(name: string, email: string, phone: string) {
    return firstValueFrom(
      this.httpService.post<IContactResponse>(
        this.amoLink + '/api/v4/contacts',
        [
          {
            name,
            custom_fields_values: [
              {
                field_code: 'PHONE',
                field_name: 'phone',
                values: [
                  {
                    value: phone,
                  },
                ],
              },
              {
                field_code: 'EMAIL',
                field_name: 'email',
                values: [
                  {
                    value: email,
                  },
                ],
              },
            ],
          },
        ],
        this.tokensService.axiosConfig,
      ),
    );
  }

  private updateContactById(
    id: number,
    name: string,
    email: string,
    phone: string,
  ) {
    return firstValueFrom(
      this.httpService.patch<IContactResponse>(
        this.amoLink + '/api/v4/contacts',
        [
          {
            id,
            name,
            custom_fields_values: [
              {
                field_code: 'PHONE',
                field_name: 'phone',
                values: [
                  {
                    value: phone,
                  },
                ],
              },
              {
                field_code: 'EMAIL',
                field_name: 'email',
                values: [
                  {
                    value: email,
                  },
                ],
              },
            ],
          },
        ],
        this.tokensService.axiosConfig,
      ),
    );
  }

  private getContactById(id: number) {
    return firstValueFrom(
      this.httpService.get<IContact>(
        this.amoLink + `/api/v4/contacts/${id}`,
        this.tokensService.axiosConfig,
      ),
    );
  }

  private async createLeadWithContact(contact: IContact) {
    return firstValueFrom(
      this.httpService.post(
        this.amoLink + '/api/v4/leads/complex',
        [
          {
            name: 'Название сделки',
            _embedded: {
              contacts: [contact],
              companies: [
                {
                  name: 'ООО Рога и Копыта',
                },
              ],
            },
          },
        ],
        this.tokensService.axiosConfig,
      ),
    );
  }

  private async updateOrCreateContact(
    name: string,
    email: string,
    phone: string,
  ): Promise<IContact> {
    let data = await firstValueFrom(
      this.httpService.get<IContactResponse>(
        this.amoLink + '/api/v4/contacts',
        {
          ...this.tokensService.axiosConfig,
          params: {
            query: phone,
          },
        },
      ),
    );

    if (data.status === 204 && data.statusText === 'No Content') {
      data = await firstValueFrom(
        this.httpService.get<IContactResponse>(
          this.amoLink + '/api/v4/contacts',
          {
            ...this.tokensService.axiosConfig,
            params: {
              query: email,
            },
          },
        ),
      );
    }

    if (data.status === 204 && data.statusText === 'No Content') {
      const { data } = await this.addContact(name, email, phone);
      const addedId = data._embedded?.contacts?.[0]?.id;

      const { data: addedContact } = await this.getContactById(addedId);

      return addedContact;
    } else if (data.data._embedded?.contacts?.[0]?.id !== undefined) {
      const { data: updatedContacts } = await this.updateContactById(
        data.data._embedded?.contacts?.[0]?.id,
        name,
        email,
        phone,
      );
      return updatedContacts._embedded?.contacts?.[0];
    }
  }
}
