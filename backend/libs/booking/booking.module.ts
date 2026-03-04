import { RoomTypeService } from './room.service'
import { AvailabilityService } from './availability.service'
import { BookingService } from './booking.service'
import { AddOnService } from './addons.service'

export const BOOKING_SERVICES = [
  RoomTypeService,
  AvailabilityService,
  BookingService,
  AddOnService,
]
