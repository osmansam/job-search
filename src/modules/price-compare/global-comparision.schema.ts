import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { purifySchema } from 'src/lib/purifySchema';

@Schema({ _id: false })
export class GlobalComparision extends Document {
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true, type: String, index: true })
  normalizedName: string;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: Object, default: {} })
  prices: Record<string, number>;

  @Prop({ required: false, type: Date })
  lastSyncedAt: Date;
}

export const GlobalComparisionSchema =
  SchemaFactory.createForClass(GlobalComparision);

purifySchema(GlobalComparisionSchema);
