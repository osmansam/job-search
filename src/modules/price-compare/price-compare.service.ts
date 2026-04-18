import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GlobalComparision } from './global-comparision.schema';

export interface SiteItemPrice {
  site: string;
  name: string;
  normalizedName: string;
  price: number;
  rawPrice: string;
}

export interface PriceHashmapValue {
  name: string;
  prices: Record<string, number>;
}

export interface GlobalHashmapResponse {
  sites: Record<string, string>;
  totalItems: number;
  totalKeys: number;
  hashmap: Record<string, PriceHashmapValue>;
}

export interface GlobalComparisonSyncResult {
  totalItems: number;
  totalKeys: number;
  inserted: number;
  updated: number;
  unchanged: number;
}

@Injectable()
export class PriceCompareService {
  private readonly blissSiteName = 'bliss';
  private readonly blissUrl =
    'https://api.blissdistribution.co.uk/api/Product/FilterProducts';
  private readonly surfinMeepleSiteName = 'surfin-meeple';
  private readonly surfinMeepleUrl =
    'https://europe.surfinmeeple.com/category/2-catalogue';
  private readonly occamSiteName = 'occam';
  private readonly occamGraphqlUrl =
    'https://www.occamdistribution.com/graphql';

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(GlobalComparision.name)
    private readonly globalComparisonModel: Model<GlobalComparision>,
  ) {}

  normalizeItemName(name: string): string {
    return name
      .toLocaleLowerCase('tr-TR')
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .trim();
  }

  async fetchBlissItems(): Promise<SiteItemPrice[]> {
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      Connection: 'keep-alive',
      'Content-Type': 'application/json',
      Origin: 'https://portal.blissdistribution.co.uk',
      Referer: 'https://portal.blissdistribution.co.uk/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'sec-ch-ua':
        '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
    };

    const params = {
      page: '1',
      limit: '1000',
      sortField: 'id',
      sortOrder: 'asc',
      specialsOnly: 'false',
      listName: 'null',
      searchType: 'null',
    };

    const body = {
      CategoryFilter: [
        {
          id: 350,
          name: 'Board Games',
          value: null,
          filterType: 'category',
          checked: true,
          isSystem: false,
        },
      ],
      ManufacturerFilter: [],
      ReleaseDateFilter: null,
      PreOrderDateFilter: null,
      AvailabilityFilter: [],
      ReleaseYearFilter: [],
      LanguageFilter: [],
      SearchTerm: null,
      DefaultWarehouseId: null,
    };

    const response = await this.httpService.axiosRef.post(this.blissUrl, body, {
      headers,
      params,
      timeout: 30000,
      validateStatus: (status: number) => status < 500,
    });

    if (response.status >= 400) {
      throw new Error(`Bliss request failed with status ${response.status}`);
    }

    return this.extractBlissItems(response.data);
  }
  async fetchSurfinMeepleItems(): Promise<SiteItemPrice[]> {
    const headers = {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      referer: this.surfinMeepleUrl,
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    };

    const firstPageResponse = await this.httpService.axiosRef.get(
      this.surfinMeepleUrl,
      {
        headers,
        params: { page: 1 },
        timeout: 30000,
        validateStatus: (status: number) => status < 500,
      },
    );

    if (firstPageResponse.status >= 400) {
      throw new Error(
        `Surfin Meeple request failed with status ${firstPageResponse.status}`,
      );
    }

    const firstPagePayload = firstPageResponse.data;
    const pagesCount = Number(firstPagePayload?.pagination?.pages_count || 1);
    const allProducts: any[] = Array.isArray(firstPagePayload?.products)
      ? [...firstPagePayload.products]
      : [];

    for (let page = 2; page <= pagesCount; page += 1) {
      const response = await this.httpService.axiosRef.get(
        this.surfinMeepleUrl,
        {
          headers,
          params: { page },
          timeout: 30000,
          validateStatus: (status: number) => status < 500,
        },
      );

      if (response.status >= 400) {
        throw new Error(
          `Surfin Meeple request failed on page ${page} with status ${response.status}`,
        );
      }

      const products = Array.isArray(response.data?.products)
        ? response.data.products
        : [];
      allProducts.push(...products);
    }

    return this.extractSurfinMeepleItems({ products: allProducts });
  }

  async fetchOccamItems(): Promise<SiteItemPrice[]> {
    const query = `query OccamProducts($pageSize: Int!, $currentPage: Int!) {
      products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
        items {
          uid
          sku
          name
          price_range {
            minimum_price {
              final_price {
                value
                currency
              }
              regular_price {
                value
                currency
              }
            }
          }
        }
        page_info {
          current_page
          page_size
          total_pages
        }
        total_count
      }
    }`;

    const headers = {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      referer: 'https://www.occamdistribution.com/shop',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    };

    const firstPageResponse = await this.httpService.axiosRef.post(
      this.occamGraphqlUrl,
      {
        query,
        variables: {
          pageSize: 100,
          currentPage: 1,
        },
      },
      {
        headers,
        timeout: 30000,
        validateStatus: (status: number) => status < 500,
      },
    );

    if (firstPageResponse.status >= 400) {
      throw new Error(
        `Occam request failed with status ${firstPageResponse.status}`,
      );
    }

    const firstPageProducts = firstPageResponse.data?.data?.products;
    const totalPages = Number(firstPageProducts?.page_info?.total_pages || 0);
    const allProducts: any[] = Array.isArray(firstPageProducts?.items)
      ? [...firstPageProducts.items]
      : [];

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.httpService.axiosRef.post(
        this.occamGraphqlUrl,
        {
          query,
          variables: {
            pageSize: 100,
            currentPage: page,
          },
        },
        {
          headers,
          timeout: 30000,
          validateStatus: (status: number) => status < 500,
        },
      );

      if (response.status >= 400) {
        throw new Error(
          `Occam request failed on page ${page} with status ${response.status}`,
        );
      }

      const products = Array.isArray(response.data?.data?.products?.items)
        ? response.data.data.products.items
        : [];
      allProducts.push(...products);
    }

    return this.extractOccamItems({ items: allProducts });
  }

  private extractBlissItems(payload: any): SiteItemPrice[] {
    const candidates =
      payload?.ProductViewModels ||
      payload?.items ||
      payload?.products ||
      payload?.results ||
      payload?.data?.items ||
      payload?.data?.products ||
      payload?.data?.results ||
      [];

    if (!Array.isArray(candidates)) {
      return [];
    }

    const items: SiteItemPrice[] = [];

    for (const item of candidates) {
      const name =
        item?.name ||
        item?.productName ||
        item?.title ||
        item?.displayName ||
        item?.product?.name;
      const numericPrice =
        this.parsePrice(item?.newPrice) ??
        this.parsePrice(item?.oldPrice) ??
        this.parsePrice(item?.msrpPrice) ??
        this.parsePrice(item?.price) ??
        this.parsePrice(item?.salePrice) ??
        this.parsePrice(item?.retailPrice) ??
        this.parsePrice(item?.rrp) ??
        this.parsePrice(item?.listPrice);

      if (!name || typeof name !== 'string' || numericPrice == null) {
        continue;
      }

      items.push({
        site: this.blissSiteName,
        name,
        normalizedName: this.normalizeItemName(name),
        price: numericPrice,
        rawPrice: String(
          item?.newPrice ??
            item?.oldPrice ??
            item?.msrpPrice ??
            item?.price ??
            item?.salePrice ??
            item?.retailPrice ??
            item?.rrp ??
            item?.listPrice,
        ),
      });
    }

    return items;
  }

  private extractSurfinMeepleItems(payload: any): SiteItemPrice[] {
    const candidates =
      payload?.products || payload?.ProductViewModels || payload?.items || [];

    if (!Array.isArray(candidates)) {
      return [];
    }

    const items: SiteItemPrice[] = [];

    for (const item of candidates) {
      const name = item?.name || item?.productName || item?.title;
      const numericPrice =
        this.parsePrice(item?.price_amount) ??
        this.parsePrice(item?.price) ??
        this.parsePrice(item?.regular_price_amount) ??
        this.parsePrice(item?.regular_price);

      if (!name || typeof name !== 'string' || numericPrice == null) {
        continue;
      }

      items.push({
        site: this.surfinMeepleSiteName,
        name,
        normalizedName: this.normalizeItemName(name),
        price: numericPrice,
        rawPrice: String(
          item?.price ??
            item?.price_amount ??
            item?.regular_price ??
            item?.regular_price_amount,
        ),
      });
    }

    return items;
  }

  private extractOccamItems(payload: any): SiteItemPrice[] {
    const candidates = payload?.items || [];

    if (!Array.isArray(candidates)) {
      return [];
    }

    const items: SiteItemPrice[] = [];

    for (const item of candidates) {
      const name = item?.name || item?.title || item?.sku;
      const numericPrice =
        this.parsePrice(item?.price_range?.minimum_price?.final_price?.value) ??
        this.parsePrice(item?.price_range?.minimum_price?.regular_price?.value);

      if (!name || typeof name !== 'string' || numericPrice == null) {
        continue;
      }

      items.push({
        site: this.occamSiteName,
        name,
        normalizedName: this.normalizeItemName(name),
        price: numericPrice,
        rawPrice: String(
          item?.price_range?.minimum_price?.final_price?.value ??
            item?.price_range?.minimum_price?.regular_price?.value,
        ),
      });
    }

    return items;
  }

  private parsePrice(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value
      .replace(/[^\d.,-]/g, '')
      .replace(/\.(?=.*\.)/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  async fetchGlobalComparisonHashmap(): Promise<GlobalHashmapResponse> {
    const items = await this.globalComparisonModel.find().lean();
    const hashmap: Record<string, PriceHashmapValue> = {};

    for (const item of items) {
      const normalizedName =
        item.normalizedName || this.normalizeItemName(item.name);

      hashmap[normalizedName] = {
        name: item.name,
        prices: item.prices || {},
      };
    }

    return {
      sites: {},
      totalItems: items.length,
      totalKeys: Object.keys(hashmap).length,
      hashmap,
    };
  }

  async syncGlobalComparisonToDb(): Promise<GlobalComparisonSyncResult> {
    const blissItems = await this.fetchBlissItems();
    const surfinMeepleItems = await this.fetchSurfinMeepleItems();
    const occamItems = await this.fetchOccamItems();
    const nextHashmap: Record<string, PriceHashmapValue> = {};

    for (const item of blissItems) {
      const current = nextHashmap[item.normalizedName] || {
        name: item.name,
        prices: {},
      };

      current.prices[this.blissSiteName] = item.price;
      nextHashmap[item.normalizedName] = current;
    }

    for (const item of surfinMeepleItems) {
      const current = nextHashmap[item.normalizedName] || {
        name: item.name,
        prices: {},
      };

      current.prices[this.surfinMeepleSiteName] = item.price;
      nextHashmap[item.normalizedName] = current;
    }

    for (const item of occamItems) {
      const current = nextHashmap[item.normalizedName] || {
        name: item.name,
        prices: {},
      };

      current.prices[this.occamSiteName] = item.price;
      nextHashmap[item.normalizedName] = current;
    }

    const normalizedNames = Object.keys(nextHashmap);
    const existingItems = await this.globalComparisonModel
      .find({ normalizedName: { $in: normalizedNames } })
      .lean();
    const existingByKey = new Map(
      existingItems.map((x) => [x.normalizedName, x]),
    );

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    const ops = normalizedNames.map((normalizedName) => {
      const nextValue = nextHashmap[normalizedName];
      const previous = existingByKey.get(normalizedName);

      if (!previous) {
        inserted += 1;
      } else if (
        previous.name !== nextValue.name ||
        JSON.stringify(previous.prices || {}) !==
          JSON.stringify(nextValue.prices || {})
      ) {
        updated += 1;
      } else {
        unchanged += 1;
      }

      return {
        updateOne: {
          filter: { normalizedName },
          update: {
            $set: {
              _id: normalizedName,
              normalizedName,
              name: nextValue.name,
              prices: nextValue.prices,
              lastSyncedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (ops.length > 0) {
      await this.globalComparisonModel.bulkWrite(ops);
    }

    return {
      totalItems:
        blissItems.length + surfinMeepleItems.length + occamItems.length,
      totalKeys: normalizedNames.length,
      inserted,
      updated,
      unchanged,
    };
  }
}
