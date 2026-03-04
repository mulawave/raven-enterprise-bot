import { MenuCategoryService, MenuItemService } from './menu.service'
import { CartService } from './cart.service'
import { OrderService } from './order.service'
import { OrderStatusUpdater } from './order.status'

export const ORDERING_SERVICES = [
  MenuCategoryService,
  MenuItemService,
  CartService,
  OrderService,
  OrderStatusUpdater,
]
