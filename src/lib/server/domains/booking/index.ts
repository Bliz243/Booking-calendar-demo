/**
 * Booking Domain
 *
 * This domain handles all service and booking management:
 * - Service CRUD (bookable offerings with constraints)
 * - Booking CRUD (customer bookings with approval workflow)
 * - Availability calculation (slot generation and validation)
 *
 * Cross-domain dependencies (via adapters):
 * - Calendar domain: Creates calendar events for confirmed bookings
 * - Resource domain: Checks resource availability for slot validation
 */

// Services (business logic)
export {
	serviceService,
	bookingService,
	availabilityService,
	type CreateServiceInput,
	type UpdateServiceInput,
	type CreateRequirementInput,
	type ServiceResult,
	type ServiceDeleteResult,
	type RequirementResult,
	type CreateBookingInput,
	type CreateBookingOptions,
	type BookingResult,
	type BookingDeleteResult,
	type ServiceContext,
	type GetSlotsOptions,
	type ValidateSlotOptions
} from './services';

// Repositories (data access)
export {
	serviceRepository,
	bookingRepository,
	type ServiceWithRequirementsRow,
	type CreateServiceData,
	type UpdateServiceData,
	type BookingWithServiceRow,
	type AssignmentWithDetailsRow,
	type CreateBookingData,
	type BookingFilters
} from './repositories';

// Adapters (cross-domain interface)
export { calendarAdapter, resourceAdapter } from './adapters';

// Types
export type {
	Service,
	ServiceRow,
	ServiceWithRequirements,
	ServiceResourceRequirement,
	ServiceResourceRequirementRow,
	ServiceResourceRequirementWithType,
	ServiceBooking,
	ServiceBookingRow,
	ServiceBookingStatus,
	ServiceBookingWithDetails,
	BookingResourceAssignment,
	BookingResourceAssignmentRow,
	BookingResourceAssignmentWithDetails,
	ApprovalStatus,
	AvailableSlot,
	AvailableResource,
	ResourceAvailabilityGroup,
	SlotValidationResult,
	BookingValidationResult
} from './types';

export {
	rowToService,
	rowToServiceResourceRequirement,
	rowToServiceBooking,
	rowToBookingResourceAssignment
} from './types';
