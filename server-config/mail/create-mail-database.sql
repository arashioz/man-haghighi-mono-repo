-- Create mailserver database and tables
-- Run this as MySQL root user

CREATE DATABASE IF NOT EXISTS mailserver;
USE mailserver;

-- Create mail user (change password!)
CREATE USER IF NOT EXISTS 'mailuser'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON mailserver.* TO 'mailuser'@'localhost';
FLUSH PRIVILEGES;

-- Virtual domains table
CREATE TABLE IF NOT EXISTS virtual_domains (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Virtual users table
CREATE TABLE IF NOT EXISTS virtual_users (
  id INT NOT NULL AUTO_INCREMENT,
  domain_id INT NOT NULL,
  email VARCHAR(120) NOT NULL,
  password VARCHAR(255) NOT NULL,
  quota BIGINT DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  FOREIGN KEY (domain_id) REFERENCES virtual_domains(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Virtual aliases table
CREATE TABLE IF NOT EXISTS virtual_aliases (
  id INT NOT NULL AUTO_INCREMENT,
  domain_id INT NOT NULL,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (domain_id) REFERENCES virtual_domains(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert your domain
INSERT INTO virtual_domains (name) VALUES ('manehaghighi.com');

-- Example: Create a test email (password: test123 - change this!)
-- Use: doveadm pw -s SHA512-CRYPT to generate password hash
-- INSERT INTO virtual_users (domain_id, email, password) VALUES (1, 'admin@manehaghighi.com', '$6$rounds=5000$...');

