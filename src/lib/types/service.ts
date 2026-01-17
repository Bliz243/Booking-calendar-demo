// Status types
export type ServiceBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Qualification types
export interface Qualification {
	id: string;
	userId: string;
	name: string;
	description: string | null;
}

export interface ResourceQualification {
	id: string;
	resourceId: string;
	qualificationId: string;
}

// Service types
export interface Service {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	color: string;
	priceCents: number | null;

	// Duration
	durationMinutes: number;
	minDurationMinutes: number | null;
	maxDurationMinutes: number | null;

	// Time constraints
	operatingDays: number[]; // 0-6, Sunday = 0
	operatingStartTime: string; // HH:mm
	operatingEndTime: string;
	minNoticeHours: number;
	maxAdvanceDays: number;

	// Booking rules
	bufferMinutes: number;
	maxConcurrentPerCustomer: number;
	cancellationHours: number;
	requiresApproval: boolean;
	capacity: number;

	isActive: boolean;
	sortOrder: number;
	createdAt: Date;
}

export interface ServiceResourceRequirement {
	id: string;
	serviceId: string;
	resourceTypeId: string;
	quantity: number;
	isOptional: boolean;
	requiredQualifications: string[];
}

export interface ServiceResourceRequirementWithType extends ServiceResourceRequirement {
	resourceTypeName: string;
	resourceTypeColor: string;
}

export interface ServiceWithRequirements extends Service {
	requirements: ServiceResourceRequirementWithType[];
}

// Service Booking types
export interface ServiceBooking {
	id: string;
	serviceId: string;
	eventId: string | null;

	customerName: string;
	customerEmail: string;
	customerPhone: string | null;
	customerNotes: string | null;

	startTime: Date;
	endTime: Date;

	status: ServiceBookingStatus;
	approvalStatus: ApprovalStatus | null;
	approvedBy: string | null;
	approvedAt: Date | null;

	createdBy: string | null;
	createdAt: Date;
	cancelledAt: Date | null;
	cancellationReason: string | null;
}

export interface BookingResourceAssignment {
	id: string;
	bookingId: string;
	resourceId: string;
}

export interface BookingResourceAssignmentWithDetails extends BookingResourceAssignment {
	resourceName: string;
	resourceTypeName: string;
	resourceTypeColor: string;
}

export interface ServiceBookingWithDetails extends ServiceBooking {
	serviceName: string;
	serviceColor: string;
	assignedResources: BookingResourceAssignmentWithDetails[];
}

// Available slot types
export interface AvailableSlot {
	startTime: Date;
	endTime: Date;
	availableResources: ResourceAvailabilityGroup[];
	remainingCapacity?: number; // For class-type services
}

export interface ResourceAvailabilityGroup {
	resourceTypeId: string;
	resourceTypeName: string;
	resources: AvailableResource[];
}

export interface AvailableResource {
	resourceId: string;
	resourceName: string;
}

// Database row types
export interface QualificationRow {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
}

export interface ResourceQualificationRow {
	id: string;
	resource_id: string;
	qualification_id: string;
}

export interface ServiceRow {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
	color: string;
	price_cents: number | null;

	duration_minutes: number;
	min_duration_minutes: number | null;
	max_duration_minutes: number | null;

	operating_days: string;
	operating_start_time: string;
	operating_end_time: string;
	min_notice_hours: number;
	max_advance_days: number;

	buffer_minutes: number;
	max_concurrent_per_customer: number;
	cancellation_hours: number;
	requires_approval: number;
	capacity: number;

	is_active: number;
	sort_order: number;
	created_at: string;
}

export interface ServiceResourceRequirementRow {
	id: string;
	service_id: string;
	resource_type_id: string;
	quantity: number;
	is_optional: number;
	required_qualifications: string | null;
}

export interface ServiceBookingRow {
	id: string;
	service_id: string;
	event_id: string | null;

	customer_name: string;
	customer_email: string;
	customer_phone: string | null;
	customer_notes: string | null;

	start_time: string;
	end_time: string;

	status: string;
	approval_status: string | null;
	approved_by: string | null;
	approved_at: string | null;

	created_by: string | null;
	created_at: string;
	cancelled_at: string | null;
	cancellation_reason: string | null;
}

export interface BookingResourceAssignmentRow {
	id: string;
	booking_id: string;
	resource_id: string;
}

// Conversion helpers
export function rowToQualification(row: QualificationRow): Qualification {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		description: row.description
	};
}

export function rowToResourceQualification(row: ResourceQualificationRow): ResourceQualification {
	return {
		id: row.id,
		resourceId: row.resource_id,
		qualificationId: row.qualification_id
	};
}

export function rowToService(row: ServiceRow): Service {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		description: row.description,
		color: row.color,
		priceCents: row.price_cents,

		durationMinutes: row.duration_minutes,
		minDurationMinutes: row.min_duration_minutes,
		maxDurationMinutes: row.max_duration_minutes,

		operatingDays: row.operating_days.split(',').map((d) => parseInt(d, 10)),
		operatingStartTime: row.operating_start_time,
		operatingEndTime: row.operating_end_time,
		minNoticeHours: row.min_notice_hours,
		maxAdvanceDays: row.max_advance_days,

		bufferMinutes: row.buffer_minutes,
		maxConcurrentPerCustomer: row.max_concurrent_per_customer,
		cancellationHours: row.cancellation_hours,
		requiresApproval: row.requires_approval === 1,
		capacity: row.capacity,

		isActive: row.is_active === 1,
		sortOrder: row.sort_order,
		createdAt: new Date(row.created_at)
	};
}

export function rowToServiceResourceRequirement(
	row: ServiceResourceRequirementRow
): ServiceResourceRequirement {
	let qualifications: string[] = [];
	if (row.required_qualifications) {
		try {
			qualifications = JSON.parse(row.required_qualifications);
		} catch {
			qualifications = [];
		}
	}

	return {
		id: row.id,
		serviceId: row.service_id,
		resourceTypeId: row.resource_type_id,
		quantity: row.quantity,
		isOptional: row.is_optional === 1,
		requiredQualifications: qualifications
	};
}

export function rowToServiceBooking(row: ServiceBookingRow): ServiceBooking {
	return {
		id: row.id,
		serviceId: row.service_id,
		eventId: row.event_id,

		customerName: row.customer_name,
		customerEmail: row.customer_email,
		customerPhone: row.customer_phone,
		customerNotes: row.customer_notes,

		startTime: new Date(row.start_time),
		endTime: new Date(row.end_time),

		status: row.status as ServiceBookingStatus,
		approvalStatus: row.approval_status as ApprovalStatus | null,
		approvedBy: row.approved_by,
		approvedAt: row.approved_at ? new Date(row.approved_at) : null,

		createdBy: row.created_by,
		createdAt: new Date(row.created_at),
		cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
		cancellationReason: row.cancellation_reason
	};
}

export function rowToBookingResourceAssignment(
	row: BookingResourceAssignmentRow
): BookingResourceAssignment {
	return {
		id: row.id,
		bookingId: row.booking_id,
		resourceId: row.resource_id
	};
}

// Input types
export interface CreateQualificationInput {
	name: string;
	description?: string;
}

export interface UpdateQualificationInput {
	name?: string;
	description?: string;
}

export interface CreateServiceInput {
	name: string;
	description?: string;
	color?: string;
	priceCents?: number;

	durationMinutes: number;
	minDurationMinutes?: number;
	maxDurationMinutes?: number;

	operatingDays?: number[];
	operatingStartTime?: string;
	operatingEndTime?: string;
	minNoticeHours?: number;
	maxAdvanceDays?: number;

	bufferMinutes?: number;
	maxConcurrentPerCustomer?: number;
	cancellationHours?: number;
	requiresApproval?: boolean;
	capacity?: number;

	resourceRequirements?: CreateServiceResourceRequirementInput[];
}

export interface UpdateServiceInput {
	name?: string;
	description?: string;
	color?: string;
	priceCents?: number;

	durationMinutes?: number;
	minDurationMinutes?: number;
	maxDurationMinutes?: number;

	operatingDays?: number[];
	operatingStartTime?: string;
	operatingEndTime?: string;
	minNoticeHours?: number;
	maxAdvanceDays?: number;

	bufferMinutes?: number;
	maxConcurrentPerCustomer?: number;
	cancellationHours?: number;
	requiresApproval?: boolean;
	capacity?: number;

	isActive?: boolean;
	sortOrder?: number;
}

export interface CreateServiceResourceRequirementInput {
	resourceTypeId: string;
	quantity?: number;
	isOptional?: boolean;
	requiredQualifications?: string[];
}

export interface UpdateServiceResourceRequirementInput {
	quantity?: number;
	isOptional?: boolean;
	requiredQualifications?: string[];
}

export interface CreateServiceBookingInput {
	serviceId: string;
	startTime: string; // ISO datetime
	endTime?: string; // ISO datetime, calculated from duration if not provided
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	customerNotes?: string;
	resourceSelections?: ResourceSelection[];
}

export interface ResourceSelection {
	resourceTypeId: string;
	resourceId: string;
}

export interface UpdateServiceBookingInput {
	status?: ServiceBookingStatus;
	customerName?: string;
	customerEmail?: string;
	customerPhone?: string;
	customerNotes?: string;
}

// Validation result types
export interface SlotValidationResult {
	valid: boolean;
	reason?: string;
	availableResources?: ResourceAvailabilityGroup[];
}

export interface BookingValidationResult {
	valid: boolean;
	reason?: string;
	assignedResources?: { resourceTypeId: string; resourceId: string }[];
}
