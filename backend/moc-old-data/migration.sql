-- Migration for Haghighi Learning Platform
-- Created: 2025-10-24T22:04:56.414Z

-- Drop tables if they exist (for clean start)
DROP TABLE IF EXISTS user_products;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- Create products table
CREATE TABLE products (
    id VARCHAR(20) PRIMARY KEY,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id VARCHAR(20) PRIMARY KEY,
    user_login VARCHAR(255) NOT NULL,
    user_nicename VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    user_pass VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    user_registered TIMESTAMP NOT NULL,
    user_status VARCHAR(10) DEFAULT '0',
    user_url TEXT,
    user_activation_key TEXT,
    sms VARCHAR(20),
    phone VARCHAR(20),
    uToken TEXT,
    spam VARCHAR(10) DEFAULT '0',
    deleted VARCHAR(10) DEFAULT '0',
    education TEXT,
    univercity TEXT,
    job TEXT,
    state TEXT,
    gender TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create user_products junction table
CREATE TABLE user_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(user_email);
CREATE INDEX idx_users_nicename ON users(user_nicename);
CREATE INDEX idx_user_products_user_id ON user_products(user_id);
CREATE INDEX idx_user_products_product_id ON user_products(product_id);
CREATE INDEX idx_products_category ON products(category);
