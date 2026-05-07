CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  course_time TEXT,
  deadline TEXT,
  capacity INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  form_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS association_members (
  id TEXT PRIMARY KEY,
  member_no TEXT UNIQUE,
  identity TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  qualification TEXT DEFAULT 'Y',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_members (
  id TEXT PRIMARY KEY,
  member_no TEXT UNIQUE,
  company_name TEXT NOT NULL,
  tax_id TEXT,
  owner TEXT,
  contact TEXT,
  qualification TEXT DEFAULT 'Y',
  register_count INTEGER DEFAULT 0,
  lecture_count INTEGER DEFAULT 0,
  teaching_count INTEGER DEFAULT 0,
  social_count INTEGER DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  member_type TEXT NOT NULL,
  member_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  checked_in_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);
