import { Body, Controller, Logger, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Public()
  @Post('/orders')
  async orderWebhook(@Body() data?: unknown) {
    this.logger.log('Received order webhook via /webhooks/orders');
    this.logger.debug(`Webhook payload: ${JSON.stringify(data)}`);

    // Keep the immediate 200-style acknowledgement pattern for webhook senders.
    return {
      received: true,
      processedAt: new Date().toISOString(),
    };
  }
}
