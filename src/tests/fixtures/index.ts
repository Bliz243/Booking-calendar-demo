import { getTestDb } from '../setup';

// Types for factory functions
export interface UserData {
	id?: string;
	email?: string;
	name?: string;
	timezone?: string;
	role?: 'admin' | 'staff' | 'customer';
	emailVerified?: boolean;
}

export interface CalendarData {
	id?: string;
	userId: string;
	name?: string;
	color?: string;
	isDefault?: boolean;
	isVisible?: boolean;
	sortOrder?: number;
}

export interface ServiceData {
	id?: string;
	userId: string;
	name?: string;
	description?: string;
	color?: string;
	priceCents?: number;
	durationMinutes?: number;
	operatingDays?: string;
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
}

export interface ResourceTypeData {
	id?: string;
	userId: string;
	name?: string;
	color?: string;
}

export interface ResourceData {
	id?: string;
	resourceTypeId: string;
	name?: string;
	description?: string;
	capacity?: number;
	location?: string;
	attributes?: string;
	isActive?: boolean;
}

export interface ServiceBookingData {
	id?: string;
	serviceId: string;
	eventId?: string;
	customerName?: string;
	customerEmail?: string;
	customerPhone?: string;
	customerNotes?: string;
	startTime: string;
	endTime: string;
	status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
	approvalStatus?: 'pending' | 'approved' | 'rejected';
	approvedBy?: string;
	createdBy?: string;
}

// Factory functions
export function createUser(data: UserData = {}): {
	id: string;
	email: string;
	name: string;
	timezone: string;
	role: string;
} {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const email = data.email ?? `user-${id.slice(0, 8)}@test.com`;
	const name = data.name ?? `Test User ${id.slice(0, 8)}`;
	const timezone = data.timezone ?? 'UTC';
	const role = data.role ?? 'customer';

	db.prepare(
		`INSERT INTO users (id, email, name, timezone, role, email_verified)
		 VALUES (?, ?, ?, ?, ?, ?)`
	).run(id, email, name, timezone, role, data.emailVerified ? 1 : 0);

	return { id, email, name, timezone, role };
}

export function createCalendar(data: CalendarData): {
	id: string;
	userId: string;
	name: string;
	color: string;
} {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const name = data.name ?? 'Test Calendar';
	const color = data.color ?? '#3b82f6';

	db.prepare(
		`INSERT INTO calendars (id, user_id, name, color, is_default, is_visible, sort_order)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.userId,
		name,
		color,
		data.isDefault ? 1 : 0,
		data.isVisible !== false ? 1 : 0,
		data.sortOrder ?? 0
	);

	return { id, userId: data.userId, name, color };
}

export function createService(data: ServiceData): {
	id: string;
	userId: string;
	name: string;
	durationMinutes: number;
} {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const name = data.name ?? 'Test Service';
	const durationMinutes = data.durationMinutes ?? 60;

	db.prepare(
		`INSERT INTO services (
			id, user_id, name, description, color, price_cents,
			duration_minutes, operating_days, operating_start_time, operating_end_time,
			min_notice_hours, max_advance_days, buffer_minutes, max_concurrent_per_customer,
			cancellation_hours, requires_approval, capacity, is_active
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.userId,
		name,
		data.description ?? null,
		data.color ?? '#3b82f6',
		data.priceCents ?? null,
		durationMinutes,
		data.operatingDays ?? '1,2,3,4,5',
		data.operatingStartTime ?? '09:00',
		data.operatingEndTime ?? '17:00',
		data.minNoticeHours ?? 24,
		data.maxAdvanceDays ?? 30,
		data.bufferMinutes ?? 0,
		data.maxConcurrentPerCustomer ?? 0,
		data.cancellationHours ?? 4,
		data.requiresApproval ? 1 : 0,
		data.capacity ?? 1,
		data.isActive !== false ? 1 : 0
	);

	return { id, userId: data.userId, name, durationMinutes };
}

export function createResourceType(data: ResourceTypeData): {
	id: string;
	userId: string;
	name: string;
	color: string;
} {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const name = data.name ?? 'Test Resource Type';
	const color = data.color ?? '#6366f1';

	db.prepare(
		`INSERT INTO resource_types (id, user_id, name, color)
		 VALUES (?, ?, ?, ?)`
	).run(id, data.userId, name, color);

	return { id, userId: data.userId, name, color };
}

export function createResource(data: ResourceData): {
	id: string;
	resourceTypeId: string;
	name: string;
} {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const name = data.name ?? 'Test Resource';

	db.prepare(
		`INSERT INTO resources (id, resource_type_id, name, description, capacity, location, attributes, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.resourceTypeId,
		name,
		data.description ?? null,
		data.capacity ?? null,
		data.location ?? null,
		data.attributes ?? null,
		data.isActive !== false ? 1 : 0
	);

	return { id, resourceTypeId: data.resourceTypeId, name };
}

export function createServiceBooking(data: ServiceBookingData): {
	id: string;
	serviceId: string;
	customerEmail: string;
	startTime: string;
	endTime: string;
	status: string;
} {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const customerName = data.customerName ?? 'Test Customer';
	const customerEmail = data.customerEmail ?? 'customer@test.com';
	const status = data.status ?? 'pending';

	db.prepare(
		`INSERT INTO service_bookings (
			id, service_id, event_id, customer_name, customer_email, customer_phone,
			customer_notes, start_time, end_time, status, approval_status, approved_by, created_by
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.serviceId,
		data.eventId ?? null,
		customerName,
		customerEmail,
		data.customerPhone ?? null,
		data.customerNotes ?? null,
		data.startTime,
		data.endTime,
		status,
		data.approvalStatus ?? null,
		data.approvedBy ?? null,
		data.createdBy ?? null
	);

	return {
		id,
		serviceId: data.serviceId,
		customerEmail,
		startTime: data.startTime,
		endTime: data.endTime,
		status
	};
}

export function createServiceResourceRequirement(data: {
	id?: string;
	serviceId: string;
	resourceTypeId: string;
	quantity?: number;
	isOptional?: boolean;
	requiredQualifications?: string[];
}): { id: string; serviceId: string; resourceTypeId: string } {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();

	db.prepare(
		`INSERT INTO service_resource_requirements (id, service_id, resource_type_id, quantity, is_optional, required_qualifications)
		 VALUES (?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.serviceId,
		data.resourceTypeId,
		data.quantity ?? 1,
		data.isOptional ? 1 : 0,
		data.requiredQualifications ? JSON.stringify(data.requiredQualifications) : null
	);

	return { id, serviceId: data.serviceId, resourceTypeId: data.resourceTypeId };
}

export function createEvent(data: {
	id?: string;
	calendarId: string;
	title?: string;
	description?: string;
	startTime: string;
	endTime: string;
	isAllDay?: boolean;
	rrule?: string;
}): { id: string; calendarId: string; title: string } {
	const db = getTestDb();
	const id = data.id ?? crypto.randomUUID();
	const title = data.title ?? 'Test Event';

	db.prepare(
		`INSERT INTO events (id, calendar_id, title, description, start_time, end_time, is_all_day, rrule)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.calendarId,
		title,
		data.description ?? null,
		data.startTime,
		data.endTime,
		data.isAllDay ? 1 : 0,
		data.rrule ?? null
	);

	return { id, calendarId: data.calendarId, title };
}

// Helper to create a complete test scenario
export function createTestScenario(): {
	user: ReturnType<typeof createUser>;
	adminUser: ReturnType<typeof createUser>;
	staffUser: ReturnType<typeof createUser>;
	calendar: ReturnType<typeof createCalendar>;
	service: ReturnType<typeof createService>;
	resourceType: ReturnType<typeof createResourceType>;
	resource: ReturnType<typeof createResource>;
} {
	const user = createUser({ role: 'customer' });
	const adminUser = createUser({ role: 'admin', email: 'admin@test.com', name: 'Admin User' });
	const staffUser = createUser({ role: 'staff', email: 'staff@test.com', name: 'Staff User' });

	const calendar = createCalendar({ userId: adminUser.id, isDefault: true });

	const service = createService({
		userId: adminUser.id,
		name: 'Consultation',
		durationMinutes: 60
	});

	const resourceType = createResourceType({
		userId: adminUser.id,
		name: 'Meeting Room'
	});

	const resource = createResource({
		resourceTypeId: resourceType.id,
		name: 'Room A'
	});

	return { user, adminUser, staffUser, calendar, service, resourceType, resource };
}
