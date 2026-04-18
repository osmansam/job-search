import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  GlobalComparision,
  GlobalComparisionSchema,
} from './global-comparision.schema';
import { PriceCompareController } from './price-compare.controller';
import { PriceCompareService } from './price-compare.service';

const mongooseModule = MongooseModule.forFeatureAsync([
  { name: GlobalComparision.name, useFactory: () => GlobalComparisionSchema },
]);

@Module({
  imports: [HttpModule, mongooseModule],
  controllers: [PriceCompareController],
  providers: [PriceCompareService],
  exports: [PriceCompareService],
})
export class PriceCompareModule {}
