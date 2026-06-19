CREATE TABLE IF NOT EXISTS a2_supplier_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  color VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_a2_supplier_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS a2_suppliers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NULL,
  name VARCHAR(180) NOT NULL,
  document VARCHAR(32) NULL,
  email VARCHAR(180) NULL,
  phone VARCHAR(40) NULL,
  whatsapp VARCHAR(40) NULL,
  pix_key VARCHAR(180) NULL,
  bank_details TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a2_suppliers_category_id (category_id),
  KEY idx_a2_suppliers_status (status),
  KEY idx_a2_suppliers_name (name),
  CONSTRAINT fk_a2_suppliers_category_id
    FOREIGN KEY (category_id) REFERENCES a2_supplier_categories (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS a2_payables (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  description VARCHAR(220) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  competency DATE NULL,
  status ENUM('open', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'open',
  recurrence ENUM('none', 'monthly', 'yearly') NOT NULL DEFAULT 'none',
  payment_method VARCHAR(80) NULL,
  paid_at DATE NULL,
  notes TEXT NULL,
  created_by VARCHAR(180) NULL,
  paid_by VARCHAR(180) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a2_payables_supplier_id (supplier_id),
  KEY idx_a2_payables_category_id (category_id),
  KEY idx_a2_payables_status (status),
  KEY idx_a2_payables_due_date (due_date),
  KEY idx_a2_payables_competency (competency),
  CONSTRAINT fk_a2_payables_supplier_id
    FOREIGN KEY (supplier_id) REFERENCES a2_suppliers (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_a2_payables_category_id
    FOREIGN KEY (category_id) REFERENCES a2_supplier_categories (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS a2_payable_files (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payable_id INT UNSIGNED NOT NULL,
  original_name VARCHAR(220) NOT NULL,
  stored_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes INT UNSIGNED NULL,
  uploaded_by VARCHAR(180) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a2_payable_files_payable_id (payable_id),
  CONSTRAINT fk_a2_payable_files_payable_id
    FOREIGN KEY (payable_id) REFERENCES a2_payables (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS a2_payable_activity (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payable_id INT UNSIGNED NOT NULL,
  actor VARCHAR(180) NULL,
  action VARCHAR(80) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a2_payable_activity_payable_id (payable_id),
  CONSTRAINT fk_a2_payable_activity_payable_id
    FOREIGN KEY (payable_id) REFERENCES a2_payables (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO a2_supplier_categories (name, color) VALUES
  ('Datacenter', '#2563eb'),
  ('Software', '#7c3aed'),
  ('Internet', '#0891b2'),
  ('Dominios', '#16a34a'),
  ('Contabilidade', '#ca8a04'),
  ('Impostos', '#dc2626'),
  ('Outros', '#64748b');
