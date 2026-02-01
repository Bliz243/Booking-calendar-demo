-- Users (Better Auth compatible)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified INTEGER DEFAULT 0 NOT NULL,
    image TEXT,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    role TEXT DEFAULT 'admin',
    timezone TEXT DEFAULT 'UTC'
);

-- Sessions (Better Auth)
CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Accounts (Better Auth)
CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Verification (Better Auth)
CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Calendars
CREATE TABLE IF NOT EXISTS calendars (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    is_default INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_all_day INTEGER DEFAULT 0,
    timezone TEXT DEFAULT 'UTC',
    rrule TEXT,
    recurrence_start TEXT,
    recurrence_end TEXT,
    status TEXT DEFAULT 'confirmed'
);

-- Event Exceptions (for recurring event modifications)
CREATE TABLE IF NOT EXISTS event_exceptions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    original_start TEXT NOT NULL,
    exception_type TEXT NOT NULL,
    title TEXT,
    start_time TEXT,
    end_time TEXT,
    UNIQUE(event_id, original_start)
);

-- Availability Templates
CREATE TABLE IF NOT EXISTS availability_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL,
    slot_duration INTEGER NOT NULL,
    buffer_before INTEGER DEFAULT 0,
    buffer_after INTEGER DEFAULT 0,
    min_notice INTEGER DEFAULT 60,
    max_advance_days INTEGER DEFAULT 60,
    is_active INTEGER DEFAULT 1
);

-- Availability Windows
CREATE TABLE IF NOT EXISTS availability_windows (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES availability_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
);

-- Availability Overrides
CREATE TABLE IF NOT EXISTS availability_overrides (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES availability_templates(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    is_available INTEGER NOT NULL,
    start_time TEXT,
    end_time TEXT,
    reason TEXT
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES availability_templates(id) ON DELETE CASCADE,
    event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    booker_name TEXT NOT NULL,
    booker_email TEXT NOT NULL,
    booker_phone TEXT,
    booker_notes TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    confirmation_token TEXT UNIQUE,
    created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Resource Types
CREATE TABLE IF NOT EXISTS resource_types (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1'
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    resource_type_id TEXT NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    location TEXT,
    attributes TEXT,
    is_active INTEGER DEFAULT 1
);

-- Resource Availability
CREATE TABLE IF NOT EXISTS resource_availability (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
);

-- Event-Resource Assignments
CREATE TABLE IF NOT EXISTS event_resources (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed',
    UNIQUE(event_id, resource_id)
);

-- Qualifications
CREATE TABLE IF NOT EXISTS qualifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT
);

-- Resource-Qualification mapping
CREATE TABLE IF NOT EXISTS resource_qualifications (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    qualification_id TEXT NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
    UNIQUE(resource_id, qualification_id)
);

-- Services
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    price_cents INTEGER,
    duration_minutes INTEGER NOT NULL,
    min_duration_minutes INTEGER,
    max_duration_minutes INTEGER,
    operating_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
    operating_start_time TEXT NOT NULL DEFAULT '09:00',
    operating_end_time TEXT NOT NULL DEFAULT '17:00',
    min_notice_hours INTEGER DEFAULT 24,
    max_advance_days INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 0,
    max_concurrent_per_customer INTEGER DEFAULT 0,
    cancellation_hours INTEGER DEFAULT 4,
    requires_approval INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

-- Service Resource Requirements
CREATE TABLE IF NOT EXISTS service_resource_requirements (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    resource_type_id TEXT NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_optional INTEGER DEFAULT 0,
    required_qualifications TEXT
);

-- Service Bookings
CREATE TABLE IF NOT EXISTS service_bookings (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_notes TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    approval_status TEXT,
    approved_by TEXT,
    approved_at INTEGER,
    created_by TEXT,
    created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    cancelled_at INTEGER,
    cancellation_reason TEXT
);

-- Booking Resource Assignments
CREATE TABLE IF NOT EXISTS booking_resource_assignments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    UNIQUE(booking_id, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_calendar_range ON events(calendar_id, recurrence_start, recurrence_end);
CREATE INDEX IF NOT EXISTS idx_bookings_template_time ON bookings(template_id, start_time);
CREATE INDEX IF NOT EXISTS idx_event_resources_resource ON event_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_calendars_user ON calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_services_user_active ON services(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_bookings_service_time ON service_bookings(service_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_resource ON booking_resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_user ON qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_qualifications_resource ON resource_qualifications(resource_id);
CREATE INDEX IF NOT EXISTS idx_session_user ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
