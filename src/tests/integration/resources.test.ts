import { describe, it, expect } from 'vitest';
import { getTestDb } from '../setup';
import { createUser, createResourceType, createResource, createService } from '../fixtures';

describe('Resources', () => {
	describe('Resource Types', () => {
		it('should create a resource type', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({
				userId: user.id,
				name: 'Meeting Room',
				color: '#ff0000'
			});

			expect(resourceType.id).toBeDefined();
			expect(resourceType.name).toBe('Meeting Room');
			expect(resourceType.color).toBe('#ff0000');
		});

		it('should read resource types for a user', () => {
			const user1 = createUser({ role: 'admin' });
			const user2 = createUser({ role: 'admin' });

			createResourceType({ userId: user1.id, name: 'Room' });
			createResourceType({ userId: user1.id, name: 'Equipment' });
			createResourceType({ userId: user2.id, name: 'Staff' });

			const db = getTestDb();
			const types = db.prepare('SELECT * FROM resource_types WHERE user_id = ?').all(user1.id);

			expect(types).toHaveLength(2);
		});

		it('should update a resource type', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id, name: 'Original' });

			const db = getTestDb();
			db.prepare('UPDATE resource_types SET name = ? WHERE id = ?').run('Updated', resourceType.id);

			const updated = db
				.prepare('SELECT name FROM resource_types WHERE id = ?')
				.get(resourceType.id) as { name: string };
			expect(updated.name).toBe('Updated');
		});

		it('should cascade delete resources when type is deleted', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			createResource({ resourceTypeId: resourceType.id, name: 'Resource 1' });
			createResource({ resourceTypeId: resourceType.id, name: 'Resource 2' });

			const db = getTestDb();

			// Verify resources exist
			const before = db
				.prepare('SELECT * FROM resources WHERE resource_type_id = ?')
				.all(resourceType.id);
			expect(before).toHaveLength(2);

			// Delete type
			db.prepare('DELETE FROM resource_types WHERE id = ?').run(resourceType.id);

			// Verify resources are deleted
			const after = db
				.prepare('SELECT * FROM resources WHERE resource_type_id = ?')
				.all(resourceType.id);
			expect(after).toHaveLength(0);
		});
	});

	describe('Resources', () => {
		it('should create a resource', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({
				resourceTypeId: resourceType.id,
				name: 'Conference Room A',
				capacity: 10,
				location: 'Floor 2'
			});

			expect(resource.id).toBeDefined();
			expect(resource.name).toBe('Conference Room A');
		});

		it('should read a resource with its type', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id, name: 'Room' });
			const resource = createResource({ resourceTypeId: resourceType.id, name: 'Room A' });

			const db = getTestDb();
			const found = db
				.prepare(
					`SELECT r.*, rt.name as type_name
					 FROM resources r
					 JOIN resource_types rt ON r.resource_type_id = rt.id
					 WHERE r.id = ?`
				)
				.get(resource.id) as { name: string; type_name: string };

			expect(found.name).toBe('Room A');
			expect(found.type_name).toBe('Room');
		});

		it('should update a resource', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id, capacity: 5 });

			const db = getTestDb();
			db.prepare('UPDATE resources SET capacity = ? WHERE id = ?').run(10, resource.id);

			const updated = db
				.prepare('SELECT capacity FROM resources WHERE id = ?')
				.get(resource.id) as {
				capacity: number;
			};
			expect(updated.capacity).toBe(10);
		});

		it('should delete a resource', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id });

			const db = getTestDb();
			db.prepare('DELETE FROM resources WHERE id = ?').run(resource.id);

			const deleted = db.prepare('SELECT * FROM resources WHERE id = ?').get(resource.id);
			expect(deleted).toBeUndefined();
		});

		it('should filter active resources', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });

			createResource({ resourceTypeId: resourceType.id, name: 'Active', isActive: true });
			createResource({ resourceTypeId: resourceType.id, name: 'Inactive', isActive: false });

			const db = getTestDb();
			const activeResources = db
				.prepare('SELECT * FROM resources WHERE resource_type_id = ? AND is_active = 1')
				.all(resourceType.id);

			expect(activeResources).toHaveLength(1);
		});
	});

	describe('Resource Availability', () => {
		it('should set resource availability windows', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id });

			const db = getTestDb();

			// Add availability for Monday (1) 9am-5pm
			db.prepare(
				`INSERT INTO resource_availability (id, resource_id, day_of_week, start_time, end_time)
				 VALUES (?, ?, ?, ?, ?)`
			).run(crypto.randomUUID(), resource.id, 1, '09:00', '17:00');

			const availability = db
				.prepare('SELECT * FROM resource_availability WHERE resource_id = ?')
				.all(resource.id) as { day_of_week: number; start_time: string; end_time: string }[];

			expect(availability).toHaveLength(1);
			expect(availability[0].day_of_week).toBe(1);
			expect(availability[0].start_time).toBe('09:00');
			expect(availability[0].end_time).toBe('17:00');
		});

		it('should support multiple availability windows per day', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id });

			const db = getTestDb();

			// Morning slot
			db.prepare(
				`INSERT INTO resource_availability (id, resource_id, day_of_week, start_time, end_time)
				 VALUES (?, ?, ?, ?, ?)`
			).run(crypto.randomUUID(), resource.id, 1, '09:00', '12:00');

			// Afternoon slot
			db.prepare(
				`INSERT INTO resource_availability (id, resource_id, day_of_week, start_time, end_time)
				 VALUES (?, ?, ?, ?, ?)`
			).run(crypto.randomUUID(), resource.id, 1, '14:00', '17:00');

			const availability = db
				.prepare('SELECT * FROM resource_availability WHERE resource_id = ? AND day_of_week = ?')
				.all(resource.id, 1);

			expect(availability).toHaveLength(2);
		});

		it('should cascade delete availability when resource is deleted', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id });

			const db = getTestDb();
			db.prepare(
				`INSERT INTO resource_availability (id, resource_id, day_of_week, start_time, end_time)
				 VALUES (?, ?, ?, ?, ?)`
			).run(crypto.randomUUID(), resource.id, 1, '09:00', '17:00');

			// Verify availability exists
			const before = db
				.prepare('SELECT * FROM resource_availability WHERE resource_id = ?')
				.all(resource.id);
			expect(before).toHaveLength(1);

			// Delete resource
			db.prepare('DELETE FROM resources WHERE id = ?').run(resource.id);

			// Verify availability is deleted
			const after = db
				.prepare('SELECT * FROM resource_availability WHERE resource_id = ?')
				.all(resource.id);
			expect(after).toHaveLength(0);
		});
	});

	describe('Resource Qualifications', () => {
		it('should create qualifications', () => {
			const user = createUser({ role: 'admin' });

			const db = getTestDb();
			const qualId = crypto.randomUUID();

			db.prepare(
				'INSERT INTO qualifications (id, user_id, name, description) VALUES (?, ?, ?, ?)'
			).run(qualId, user.id, 'CPR Certified', 'First aid certification');

			const qual = db.prepare('SELECT * FROM qualifications WHERE id = ?').get(qualId) as {
				name: string;
				description: string;
			};

			expect(qual.name).toBe('CPR Certified');
			expect(qual.description).toBe('First aid certification');
		});

		it('should assign qualifications to resources', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id, name: 'Staff' });
			const resource = createResource({ resourceTypeId: resourceType.id, name: 'John' });

			const db = getTestDb();

			// Create qualifications
			const qual1Id = crypto.randomUUID();
			const qual2Id = crypto.randomUUID();

			db.prepare('INSERT INTO qualifications (id, user_id, name) VALUES (?, ?, ?)').run(
				qual1Id,
				user.id,
				'CPR'
			);
			db.prepare('INSERT INTO qualifications (id, user_id, name) VALUES (?, ?, ?)').run(
				qual2Id,
				user.id,
				'First Aid'
			);

			// Assign to resource
			db.prepare(
				'INSERT INTO resource_qualifications (id, resource_id, qualification_id) VALUES (?, ?, ?)'
			).run(crypto.randomUUID(), resource.id, qual1Id);
			db.prepare(
				'INSERT INTO resource_qualifications (id, resource_id, qualification_id) VALUES (?, ?, ?)'
			).run(crypto.randomUUID(), resource.id, qual2Id);

			const resourceQuals = db
				.prepare(
					`SELECT q.name
					 FROM resource_qualifications rq
					 JOIN qualifications q ON rq.qualification_id = q.id
					 WHERE rq.resource_id = ?`
				)
				.all(resource.id) as { name: string }[];

			expect(resourceQuals).toHaveLength(2);
			expect(resourceQuals.map((q) => q.name)).toContain('CPR');
			expect(resourceQuals.map((q) => q.name)).toContain('First Aid');
		});

		it('should prevent duplicate qualification assignments', () => {
			const user = createUser({ role: 'admin' });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id });

			const db = getTestDb();
			const qualId = crypto.randomUUID();

			db.prepare('INSERT INTO qualifications (id, user_id, name) VALUES (?, ?, ?)').run(
				qualId,
				user.id,
				'Test Qual'
			);

			db.prepare(
				'INSERT INTO resource_qualifications (id, resource_id, qualification_id) VALUES (?, ?, ?)'
			).run(crypto.randomUUID(), resource.id, qualId);

			// Try to add same qualification again
			expect(() => {
				db.prepare(
					'INSERT INTO resource_qualifications (id, resource_id, qualification_id) VALUES (?, ?, ?)'
				).run(crypto.randomUUID(), resource.id, qualId);
			}).toThrow(); // UNIQUE constraint violation
		});
	});

	describe('Service Resource Requirements', () => {
		it('should require specific resource types for a service', () => {
			const user = createUser({ role: 'admin' });
			const roomType = createResourceType({ userId: user.id, name: 'Room' });
			const equipmentType = createResourceType({ userId: user.id, name: 'Equipment' });
			const service = createService({ userId: user.id, name: 'Workshop' });

			const db = getTestDb();

			// Require 1 room
			db.prepare(
				`INSERT INTO service_resource_requirements (id, service_id, resource_type_id, quantity, is_optional)
				 VALUES (?, ?, ?, ?, ?)`
			).run(crypto.randomUUID(), service.id, roomType.id, 1, 0);

			// Require 2 pieces of equipment (optional)
			db.prepare(
				`INSERT INTO service_resource_requirements (id, service_id, resource_type_id, quantity, is_optional)
				 VALUES (?, ?, ?, ?, ?)`
			).run(crypto.randomUUID(), service.id, equipmentType.id, 2, 1);

			const requirements = db
				.prepare(
					`SELECT srr.*, rt.name as type_name
					 FROM service_resource_requirements srr
					 JOIN resource_types rt ON srr.resource_type_id = rt.id
					 WHERE srr.service_id = ?`
				)
				.all(service.id) as { type_name: string; quantity: number; is_optional: number }[];

			expect(requirements).toHaveLength(2);

			const roomReq = requirements.find((r) => r.type_name === 'Room');
			expect(roomReq?.quantity).toBe(1);
			expect(roomReq?.is_optional).toBe(0);

			const equipReq = requirements.find((r) => r.type_name === 'Equipment');
			expect(equipReq?.quantity).toBe(2);
			expect(equipReq?.is_optional).toBe(1);
		});

		it('should store required qualifications as JSON', () => {
			const user = createUser({ role: 'admin' });
			const staffType = createResourceType({ userId: user.id, name: 'Staff' });
			const service = createService({ userId: user.id, name: 'Medical Consultation' });

			const db = getTestDb();

			// Create qualifications
			const cprQualId = crypto.randomUUID();
			const medQualId = crypto.randomUUID();

			db.prepare('INSERT INTO qualifications (id, user_id, name) VALUES (?, ?, ?)').run(
				cprQualId,
				user.id,
				'CPR'
			);
			db.prepare('INSERT INTO qualifications (id, user_id, name) VALUES (?, ?, ?)').run(
				medQualId,
				user.id,
				'Medical License'
			);

			// Require staff with specific qualifications
			db.prepare(
				`INSERT INTO service_resource_requirements (id, service_id, resource_type_id, quantity, required_qualifications)
				 VALUES (?, ?, ?, ?, ?)`
			).run(
				crypto.randomUUID(),
				service.id,
				staffType.id,
				1,
				JSON.stringify([cprQualId, medQualId])
			);

			const requirement = db
				.prepare(
					'SELECT required_qualifications FROM service_resource_requirements WHERE service_id = ?'
				)
				.get(service.id) as { required_qualifications: string };

			const qualIds = JSON.parse(requirement.required_qualifications);
			expect(qualIds).toContain(cprQualId);
			expect(qualIds).toContain(medQualId);
		});
	});
});
