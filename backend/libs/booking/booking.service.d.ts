import { PrismaClient, Booking } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { AuditLogger } from '../monitoring/audit.logger';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export declare class BookingService {
    private readonly prisma;
    private readonly availability;
    private readonly auditLogger;
    constructor(prisma: PrismaClient, availability: AvailabilityService, auditLogger: AuditLogger);
    createBooking(tenantId: string, branchId: string, customerId: string, roomTypeId: string, start: Date, end: Date, totalKobo: number): Promise<Booking>;
    getBooking(tenantId: string, branchId: string, bookingId: string): Promise<Booking | null>;
    listBookings(tenantId: string, branchId: string): Promise<Booking[]>;
    updateStatus(tenantId: string, bookingId: string, status: BookingStatus): Promise<Booking>;
}
