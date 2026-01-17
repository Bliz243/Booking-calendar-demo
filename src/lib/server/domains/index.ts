/**
 * Domain Layer
 *
 * This is the main entry point for all domain services. Each domain is responsible
 * for its own business logic and data access:
 *
 * - Calendar: Manages calendars, events, and recurrence
 * - Resource: Manages resource types, resources, qualifications, and availability
 * - Booking: Manages services and customer bookings with approval workflow
 *
 * Cross-domain communication flows through adapters within each domain to maintain
 * loose coupling while allowing necessary integrations.
 */

// Calendar Domain
export {
	calendarService,
	eventService,
	recurrenceService,
	calendarRepository,
	eventRepository
} from './calendar';

export type {
	Calendar,
	NewCalendar,
	Event,
	NewEvent,
	EventException,
	NewEventException,
	CreateCalendarInput,
	UpdateCalendarInput,
	CalendarResult,
	CalendarDeleteResult,
	CreateEventInput,
	UpdateEventInput,
	EventResult,
	EventDeleteResult,
	EventInstance,
	RecurrenceBounds,
	RRuleOptions
} from './calendar';

// Resource Domain
export {
	resourceTypeService,
	resourceService,
	qualificationService,
	availabilityService as resourceAvailabilityService,
	resourceTypeRepository,
	resourceRepository,
	qualificationRepository
} from './resource';

export type {
	ResourceType,
	Resource,
	ResourceWithType,
	ResourceAvailability,
	ResourceTypeRow,
	ResourceRow,
	ResourceAvailabilityRow,
	Qualification,
	QualificationRow,
	CreateResourceTypeInput,
	UpdateResourceTypeInput,
	ResourceTypeResult,
	ResourceTypeDeleteResult,
	CreateResourceInput,
	UpdateResourceInput,
	ResourceFilters,
	ResourceResult,
	ResourceDeleteResult,
	CreateQualificationInput,
	UpdateQualificationInput,
	QualificationResult,
	QualificationDeleteResult,
	ResourceWithAvailability
} from './resource';

// Booking Domain
export {
	serviceService,
	bookingService,
	availabilityService as bookingAvailabilityService,
	serviceRepository,
	bookingRepository,
	calendarAdapter,
	resourceAdapter
} from './booking';

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
	BookingValidationResult,
	CreateServiceInput as CreateBookingServiceInput,
	UpdateServiceInput as UpdateBookingServiceInput,
	CreateRequirementInput,
	ServiceResult,
	ServiceDeleteResult,
	RequirementResult,
	CreateBookingInput,
	CreateBookingOptions,
	BookingResult,
	BookingDeleteResult,
	ServiceContext,
	GetSlotsOptions,
	ValidateSlotOptions,
	ServiceWithRequirementsRow,
	CreateServiceData,
	UpdateServiceData,
	BookingWithServiceRow,
	AssignmentWithDetailsRow,
	CreateBookingData,
	BookingFilters
} from './booking';
