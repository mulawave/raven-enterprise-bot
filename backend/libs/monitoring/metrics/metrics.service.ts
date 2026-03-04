import { MetricsCollector } from './metrics.collector';
export class MetricsService {
  constructor(private readonly collector: MetricsCollector) {}

  recordRequest(tenantId: string) {
    this.collector.trackRequest(tenantId);
  }

  recordOrder(tenantId: string, hour: number) {
    this.collector.trackOrder(tenantId, hour);
  }

  recordBooking(tenantId: string, hour: number) {
    this.collector.trackBooking(tenantId, hour);
  }

  recordPayment(success: boolean) {
    this.collector.trackPayment(success);
  }

  recordAIFallback(fallback: boolean) {
    this.collector.trackAIFallback(fallback);
  }

  getRequestsPerTenant() {
    return this.collector.getRequestsPerTenant();
  }

  getOrdersPerHour() {
    return this.collector.getOrdersPerHour();
  }

  getBookingsPerHour() {
    return this.collector.getBookingsPerHour();
  }

  getPaymentSuccessRate() {
    return this.collector.getPaymentSuccessRate();
  }

  getAIFallbackRate() {
    return this.collector.getAIFallbackRate();
  }
}
