import { ConfigManager } from './core/config';
import { HttpClient } from './core/httpClient';
import { ProductClient } from './clients/productClient';
import { OrderClient } from './clients/orderClient';
import { AuthorizationClient } from './clients/authorizationClient';
import { UsageClient } from './clients/usageClient';
import { SdkConfig } from './types';

export class DataElementClient {
  private readonly configManager: ConfigManager;
  private readonly httpClient: HttpClient;

  public readonly products: ProductClient;
  public readonly orders: OrderClient;
  public readonly authorizations: AuthorizationClient;
  public readonly usages: UsageClient;

  constructor(config: SdkConfig) {
    this.configManager = new ConfigManager(config);
    this.httpClient = new HttpClient(this.configManager);
    this.products = new ProductClient(this.httpClient);
    this.orders = new OrderClient(this.httpClient);
    this.authorizations = new AuthorizationClient(this.httpClient);
    this.usages = new UsageClient(this.httpClient);
  }

  public updateConfig(patch: Partial<SdkConfig>): void {
    this.configManager.update(patch);
  }

  public getConfig(): SdkConfig {
    return this.configManager.getConfig();
  }

  public destroy(): void {
    this.httpClient.destroy();
  }

  public static create(config: SdkConfig): DataElementClient {
    return new DataElementClient(config);
  }
}

export default DataElementClient;
