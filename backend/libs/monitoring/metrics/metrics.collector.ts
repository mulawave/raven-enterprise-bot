export class MetricsCollector {
  private requestsPerTenant: Record<string, number> = {};
  private ordersPerHour: Record<string, number[]> = {};
  private bookingsPerHour: Record<string, number[]> = {};
  private paymentSuccess: { success: number; total: number } = { success: 0, total: 0 };
  private aiFallback: { fallback: number; total: number } = { fallback: 0, total: 0 };

  trackRequest(tenantId: string) {
    this.requestsPerTenant[tenantId] = (this.requestsPerTenant[tenantId] || 0) + 1;
  }

  trackOrder(tenantId: string, hour: number) {
    if (!this.ordersPerHour[tenantId]) this.ordersPerHour[tenantId] = Array(24).fill(0);
    this.ordersPerHour[tenantId][hour]++;
  }

  trackBooking(tenantId: string, hour: number) {
    if (!this.bookingsPerHour[tenantId]) this.bookingsPerHour[tenantId] = Array(24).fill(0);
    this.bookingsPerHour[tenantId][hour]++;
  }

  trackPayment(success: boolean) {
    this.paymentSuccess.total++;
    if (success) this.paymentSuccess.success++;
  }

  trackAIFallback(fallback: boolean) {
    this.aiFallback.total++;
    if (fallback) this.aiFallback.fallback++;
  }

  getRequestsPerTenant() {
    return this.requestsPerTenant;
  }

  getOrdersPerHour() {
    return this.ordersPerHour;
  }

  getBookingsPerHour() {
    return this.bookingsPerHour;
  }

  getPaymentSuccessRate() {
    return this.paymentSuccess.total === 0 ? 0 : this.paymentSuccess.success / this.paymentSuccess.total;
  }

  getAIFallbackRate() {
    return this.aiFallback.total === 0 ? 0 : this.aiFallback.fallback / this.aiFallback.total;
  }
}
