CREATE TABLE IF NOT EXISTS a2_payable_recurring_rules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  payment_method_id INT UNSIGNED NULL,
  description VARCHAR(220) NOT NULL,
  due_day TINYINT UNSIGNED NOT NULL,
  value_type ENUM('fixed', 'variable') NOT NULL DEFAULT 'variable',
  amount DECIMAL(12,2) NULL,
  recurrence ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_by VARCHAR(180) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a2_payable_recurring_supplier_id (supplier_id),
  KEY idx_a2_payable_recurring_category_id (category_id),
  KEY idx_a2_payable_recurring_payment_method_id (payment_method_id),
  KEY idx_a2_payable_recurring_status (status),
  CONSTRAINT fk_a2_payable_recurring_supplier_id
    FOREIGN KEY (supplier_id) REFERENCES a2_suppliers (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_a2_payable_recurring_category_id
    FOREIGN KEY (category_id) REFERENCES a2_supplier_categories (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_a2_payable_recurring_payment_method_id
    FOREIGN KEY (payment_method_id) REFERENCES a2_payment_methods (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
