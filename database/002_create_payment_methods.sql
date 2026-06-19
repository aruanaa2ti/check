CREATE TABLE IF NOT EXISTS a2_payment_methods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_a2_payment_methods_name (name),
  KEY idx_a2_payment_methods_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO a2_payment_methods (name) VALUES
  ('Boleto'),
  ('Cartao'),
  ('Pix'),
  ('Dinheiro');

ALTER TABLE a2_payables
  ADD COLUMN payment_method_id INT UNSIGNED NULL AFTER recurrence,
  ADD KEY idx_a2_payables_payment_method_id (payment_method_id),
  ADD CONSTRAINT fk_a2_payables_payment_method_id
    FOREIGN KEY (payment_method_id) REFERENCES a2_payment_methods (id)
    ON DELETE SET NULL;
