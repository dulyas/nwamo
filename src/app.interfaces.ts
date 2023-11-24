export type ITokensResponse = {
  token_type: 'Bearer';
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

export type IContactResponse = {
  _embedded: {
    contacts: IContact[];
  };
};

export type IContact = { id: number };
