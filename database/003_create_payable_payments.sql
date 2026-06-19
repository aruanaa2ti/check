CREATE TABLE IF NOT EXISTS a2_payable_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payable_id INT UNSIGNED NOT NULL,
  payment_method_id INT UNSIGNED NULL,
  paid_at DATE NOT NULL,
  base_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  created_by VARCHAR(180) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_a2_payable_payments_payable_id (payable_id),
  KEY idx_a2_payable_payments_payment_method_id (payment_method_id),
  KEY idx_a2_payable_payments_paid_at (paid_at),
  CONSTRAINT fk_a2_payable_payments_payable_id
    FOREIGN KEY (payable_id) REFERENCES a2_payables (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_a2_payable_payments_payment_method_id
    FOREIGN KEY (payment_method_id) REFERENCES a2_payment_methods (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
