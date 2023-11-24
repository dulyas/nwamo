import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema()
export class RefreshToken {
  @Prop()
  token: string;

  @Prop({ type: Date })
  date: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
