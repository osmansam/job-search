import { Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PriceCompareService } from './price-compare.service';

@Controller('/price-compare')
export class PriceCompareController {
  constructor(private readonly priceCompareService: PriceCompareService) {}

  @Public()
  @Get('bliss')
  async getBlissItems() {
    return this.priceCompareService.fetchBlissItems();
  }

  @Public()
  @Get('bliss/hashmap')
  async getBlissHashmapPreview() {
    const items = await this.priceCompareService.fetchBlissItems();
    const hashmap = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.normalizedName] = item.price;
      return acc;
    }, {});

    return {
      site: 'bliss',
      totalItems: items.length,
      totalKeys: Object.keys(hashmap).length,
      hashmap,
    };
  }

  @Public()
  @Get('surfin-meeple')
  async getSurfinMeepleItems() {
    return this.priceCompareService.fetchSurfinMeepleItems();
  }

  @Public()
  @Get('surfin-meeple/hashmap')
  async getSurfinMeepleHashmapPreview() {
    const items = await this.priceCompareService.fetchSurfinMeepleItems();
    const hashmap = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.normalizedName] = item.price;
      return acc;
    }, {});

    return {
      site: 'surfin-meeple',
      totalItems: items.length,
      totalKeys: Object.keys(hashmap).length,
      hashmap,
    };
  }

  @Public()
  @Get('occam')
  async getOccamItems() {
    return this.priceCompareService.fetchOccamItems();
  }

  @Public()
  @Get('occam/hashmap')
  async getOccamHashmapPreview() {
    const items = await this.priceCompareService.fetchOccamItems();
    const hashmap = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.normalizedName] = item.price;
      return acc;
    }, {});

    return {
      site: 'occam',
      totalItems: items.length,
      totalKeys: Object.keys(hashmap).length,
      hashmap,
    };
  }

  @Public()
  @Get('global-comparison/hashmap')
  async getGlobalComparisonHashmap() {
    return this.priceCompareService.fetchGlobalComparisonHashmap();
  }

  @Public()
  @Post('/sync-global-comparison')
  async triggerGlobalComparisonSync() {
    return this.priceCompareService.syncGlobalComparisonToDb();
  }
}
