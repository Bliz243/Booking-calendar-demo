/**
 * Booking Domain Types
 *
 * Re-exports all types needed by the booking domain from the shared types.
 * This provides a single import point for consumers of this domain.
 */

// Service types
export type {
	Service,
	ServiceRow,
	ServiceWithRequirements,
	ServiceResourceRequirement,
	ServiceResourceRequirementRow,
	ServiceResourceRequirementWithType
} from '$lib/types/service';

// Booking types
export type {
	ServiceBooking,
	ServiceBookingRow,
	ServiceBookingStatus,
	ServiceBookingWithDetails,
	BookingResourceAssignment,
	BookingResourceAssignmentRow,
	BookingResourceAssignmentWithDetails,
	ApprovalStatus
} from '$lib/types/service';

// Slot types
export type {
	AvailableSlot,
	AvailableResource,
	ResourceAvailabilityGroup,
	SlotValidationResult,
	BookingValidationResult
} from '$lib/types/service';

// Input types
export type {
	CreateServiceInput,
	UpdateServiceInput,
	CreateServiceResourceRequirementInput,
	UpdateServiceResourceRequirementInput,
	CreateServiceBookingInput,
	UpdateServiceBookingInput,
	ResourceSelection
} from '$lib/types/service';

// Row converters
export {
	rowToService,
	rowToServiceResourceRequirement,
	rowToServiceBooking,
	rowToBookingResourceAssignment
} from '$lib/types/service';
