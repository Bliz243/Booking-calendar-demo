import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryAll, queryOne, execute, transaction } from '$lib/server/db/client';
import { createServiceSchema, getServicesQuerySchema } from '$lib/schemas/service';
import type {
	ServiceRow,
	ServiceResourceRequirementRow,
	ServiceWithRequirements
} from '$lib/types/service';
import { rowToService, rowToServiceResourceRequirement } from '$lib/types/service';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/services - List all services
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);

	const params = {
		isActive: event.url.searchParams.get('isActive') || undefined
	};

	const parsed = getServicesQuerySchema.safeParse(params);

	if (!parsed.success) {
		return errors.validation('Invalid query params', event.locals.requestId, parsed.error.issues);
	}

	let query = `SELECT * FROM services WHERE 1=1`;
	const queryParams: unknown[] = [];

	if (parsed.data.isActive !== undefined) {
		query += ' AND is_active = ?';
		queryParams.push(parsed.data.isActive ? 1 : 0);
	}

	query += ' ORDER BY sort_order, name';

	const rows = queryAll<ServiceRow>(query, queryParams);
	const services = rows.map((r) => rowToService(r));

	const serviceIds = services.map((s) => s.id);

	if (serviceIds.length === 0) {
		return json({
			services: services.map((s) => ({ ...s, requirements: [] }))
		});
	}

	const placeholders = serviceIds.map(() => '?').join(',');
	const requirementRows = queryAll<
		ServiceResourceRequirementRow & { type_name: string | null; type_color: string | null }
	>(
		`
		SELECT srr.*, rt.name as type_name, rt.color as type_color
		FROM service_resource_requirements srr
		LEFT JOIN resource_types rt ON rt.id = srr.resource_type_id
		WHERE srr.service_id IN (${placeholders})
		`,
		serviceIds
	);

	const requirementsByService = new Map<string, typeof requirementRows>();
	for (const row of requirementRows) {
		const existing = requirementsByService.get(row.service_id) || [];
		existing.push(row);
		requirementsByService.set(row.service_id, existing);
	}

	const servicesWithRequirements: ServiceWithRequirements[] = services.map((service) => {
		const reqRows = requirementsByService.get(service.id) || [];
		return {
			...service,
			requirements: reqRows.map((r) => ({
				...rowToServiceResourceRequirement(r),
				resourceTypeName: r.type_name || 'Unknown',
				resourceTypeColor: r.type_color || '#888888'
			}))
		};
	});

	return json({ services: servicesWithRequirements });
};

// POST /api/admin/services - Create a service
export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createServiceSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const {
		name,
		description,
		color,
		priceCents,
		durationMinutes,
		minDurationMinutes,
		maxDurationMinutes,
		operatingDays,
		operatingStartTime,
		operatingEndTime,
		minNoticeHours,
		maxAdvanceDays,
		bufferMinutes,
		maxConcurrentPerCustomer,
		cancellationHours,
		requiresApproval,
		capacity,
		resourceRequirements
	} = parsed.data;

	const result = transaction(() => {
		const id = generateId();

		execute(
			`
			INSERT INTO services (
				id, user_id, name, description, color, price_cents,
				duration_minutes, min_duration_minutes, max_duration_minutes,
				operating_days, operating_start_time, operating_end_time,
				min_notice_hours, max_advance_days, buffer_minutes,
				max_concurrent_per_customer, cancellation_hours, requires_approval,
				capacity, is_active, sort_order, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))
			`,
			[
				id,
				user.id,
				name,
				description ?? null,
				color,
				priceCents ?? null,
				durationMinutes,
				minDurationMinutes ?? null,
				maxDurationMinutes ?? null,
				operatingDays.join(','),
				operatingStartTime,
				operatingEndTime,
				minNoticeHours,
				maxAdvanceDays,
				bufferMinutes,
				maxConcurrentPerCustomer,
				cancellationHours,
				requiresApproval ? 1 : 0,
				capacity
			]
		);

		// Create resource requirements if provided
		if (resourceRequirements && resourceRequirements.length > 0) {
			for (const req of resourceRequirements) {
				// Verify resource type exists
				const resourceType = queryOne<{ id: string }>(
					`SELECT id FROM resource_types WHERE id = ? AND user_id = ?`,
					[req.resourceTypeId, user.id]
				);

				if (!resourceType) {
					throw new Error(`Resource type ${req.resourceTypeId} not found`);
				}

				execute(
					`
					INSERT INTO service_resource_requirements (
						id, service_id, resource_type_id, quantity, is_optional, required_qualifications
					) VALUES (?, ?, ?, ?, ?, ?)
					`,
					[
						generateId(),
						id,
						req.resourceTypeId,
						req.quantity,
						req.isOptional ? 1 : 0,
						JSON.stringify(req.requiredQualifications)
					]
				);
			}
		}

		return id;
	});

	// Fetch the created service with requirements
	const serviceRow = queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ?`, [result]);
	const requirementRows = queryAll<
		ServiceResourceRequirementRow & { type_name: string; type_color: string }
	>(
		`
		SELECT srr.*, rt.name as type_name, rt.color as type_color
		FROM service_resource_requirements srr
		JOIN resource_types rt ON rt.id = srr.resource_type_id
		WHERE srr.service_id = ?
		`,
		[result]
	);

	const service: ServiceWithRequirements = {
		...rowToService(serviceRow!),
		requirements: requirementRows.map((r) => ({
			...rowToServiceResourceRequirement(r),
			resourceTypeName: r.type_name,
			resourceTypeColor: r.type_color
		}))
	};

	return json({ service }, { status: 201 });
};
