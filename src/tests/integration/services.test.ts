import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb } from '../setup';
import {
	createUser,
	createService,
	createResourceType,
	createServiceResourceRequirement
} from '../fixtures';

describe('Services', () => {
	describe('CRUD operations', () => {
		it('should create a service', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({
				userId: user.id,
				name: 'Consultation',
				durationMinutes: 60
			});

			expect(service.id).toBeDefined();
			expect(service.name).toBe('Consultation');
			expect(service.durationMinutes).toBe(60);
		});

		it('should read a service by id', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });

			const db = getTestDb();
			const found = db.prepare('SELECT * FROM services WHERE id = ?').get(service.id) as {
				id: string;
				name: string;
			};

			expect(found).toBeDefined();
			expect(found.name).toBe(service.name);
		});

		it('should update a service', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id, name: 'Original' });

			const db = getTestDb();
			db.prepare('UPDATE services SET name = ? WHERE id = ?').run('Updated', service.id);

			const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(service.id) as {
				name: string;
			};
			expect(updated.name).toBe('Updated');
		});

		it('should delete a service', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });

			const db = getTestDb();
			db.prepare('DELETE FROM services WHERE id = ?').run(service.id);

			const deleted = db.prepare('SELECT * FROM services WHERE id = ?').get(service.id);
			expect(deleted).toBeUndefined();
		});

		it('should list services for a user', () => {
			const user1 = createUser({ role: 'admin' });
			const user2 = createUser({ role: 'admin' });

			createService({ userId: user1.id, name: 'Service A' });
			createService({ userId: user1.id, name: 'Service B' });
			createService({ userId: user2.id, name: 'Service C' });

			const db = getTestDb();
			const services = db
				.prepare('SELECT * FROM services WHERE user_id = ? ORDER BY name')
				.all(user1.id) as { name: string }[];

			expect(services).toHaveLength(2);
			expect(services[0].name).toBe('Service A');
			expect(services[1].name).toBe('Service B');
		});
	});

	describe('Service constraints', () => {
		it('should enforce required fields', () => {
			const user = createUser({ role: 'admin' });
			const db = getTestDb();

			expect(() => {
				db.prepare('INSERT INTO services (id, user_id, duration_minutes) VALUES (?, ?, ?)').run(
					crypto.randomUUID(),
					user.id,
					60
				);
			}).toThrow(); // name is required
		});

		it('should default operating days to weekdays', () => {
			const user = createUser({ role: 'admin' });
			const db = getTestDb();

			const id = crypto.randomUUID();
			db.prepare(
				'INSERT INTO services (id, user_id, name, duration_minutes) VALUES (?, ?, ?, ?)'
			).run(id, user.id, 'Test', 60);

			const service = db.prepare('SELECT operating_days FROM services WHERE id = ?').get(id) as {
				operating_days: string;
			};
			expect(service.operating_days).toBe('1,2,3,4,5');
		});

		it('should default operating hours to 9-5', () => {
			const user = createUser({ role: 'admin' });
			const db = getTestDb();

			const id = crypto.randomUUID();
			db.prepare(
				'INSERT INTO services (id, user_id, name, duration_minutes) VALUES (?, ?, ?, ?)'
			).run(id, user.id, 'Test', 60);

			const service = db
				.prepare('SELECT operating_start_time, operating_end_time FROM services WHERE id = ?')
				.get(id) as {
				operating_start_time: string;
				operating_end_time: string;
			};
			expect(service.operating_start_time).toBe('09:00');
			expect(service.operating_end_time).toBe('17:00');
		});
	});

	describe('Service resource requirements', () => {
		it('should create resource requirements for a service', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const resourceType = createResourceType({ userId: user.id, name: 'Room' });

			const requirement = createServiceResourceRequirement({
				serviceId: service.id,
				resourceTypeId: resourceType.id,
				quantity: 1
			});

			expect(requirement.id).toBeDefined();
			expect(requirement.serviceId).toBe(service.id);
			expect(requirement.resourceTypeId).toBe(resourceType.id);
		});

		it('should cascade delete requirements when service is deleted', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const resourceType = createResourceType({ userId: user.id });

			createServiceResourceRequirement({
				serviceId: service.id,
				resourceTypeId: resourceType.id
			});

			const db = getTestDb();

			// Verify requirement exists
			const beforeDelete = db
				.prepare('SELECT * FROM service_resource_requirements WHERE service_id = ?')
				.all(service.id);
			expect(beforeDelete).toHaveLength(1);

			// Delete service
			db.prepare('DELETE FROM services WHERE id = ?').run(service.id);

			// Verify requirement is deleted
			const afterDelete = db
				.prepare('SELECT * FROM service_resource_requirements WHERE service_id = ?')
				.all(service.id);
			expect(afterDelete).toHaveLength(0);
		});

		it('should allow multiple resource requirements per service', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const roomType = createResourceType({ userId: user.id, name: 'Room' });
			const equipmentType = createResourceType({ userId: user.id, name: 'Equipment' });

			createServiceResourceRequirement({
				serviceId: service.id,
				resourceTypeId: roomType.id,
				quantity: 1
			});
			createServiceResourceRequirement({
				serviceId: service.id,
				resourceTypeId: equipmentType.id,
				quantity: 2
			});

			const db = getTestDb();
			const requirements = db
				.prepare('SELECT * FROM service_resource_requirements WHERE service_id = ?')
				.all(service.id);

			expect(requirements).toHaveLength(2);
		});
	});

	describe('Service filtering', () => {
		it('should filter by active status', () => {
			const user = createUser({ role: 'admin' });
			createService({ userId: user.id, name: 'Active', isActive: true });
			createService({ userId: user.id, name: 'Inactive', isActive: false });

			const db = getTestDb();
			const activeServices = db
				.prepare('SELECT * FROM services WHERE user_id = ? AND is_active = 1')
				.all(user.id);

			expect(activeServices).toHaveLength(1);
		});

		it('should order by sort_order then name', () => {
			const user = createUser({ role: 'admin' });

			const db = getTestDb();
			db.prepare(
				'INSERT INTO services (id, user_id, name, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?)'
			).run(crypto.randomUUID(), user.id, 'Zebra', 60, 0);
			db.prepare(
				'INSERT INTO services (id, user_id, name, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?)'
			).run(crypto.randomUUID(), user.id, 'Apple', 60, 1);
			db.prepare(
				'INSERT INTO services (id, user_id, name, duration_minutes, sort_order) VALUES (?, ?, ?, ?, ?)'
			).run(crypto.randomUUID(), user.id, 'Banana', 60, 0);

			const services = db
				.prepare('SELECT name FROM services WHERE user_id = ? ORDER BY sort_order, name')
				.all(user.id) as { name: string }[];

			expect(services.map((s) => s.name)).toEqual(['Banana', 'Zebra', 'Apple']);
		});
	});
});
