USE re_ec;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  login_id VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category VARCHAR(255) NOT NULL DEFAULT 'ポンチョ',
  main_image_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE uploads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  url VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uploads_product_url (product_id, url),
  INDEX idx_uploads_product_position (product_id, position),
  CONSTRAINT fk_uploads_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  nickname VARCHAR(100) NULL,
  brand VARCHAR(100) NULL,
  last4 VARCHAR(4) NOT NULL,
  exp_month TINYINT NOT NULL,
  exp_year SMALLINT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE addresses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  first_name_kana VARCHAR(100) NOT NULL,
  last_name_kana VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  prefecture VARCHAR(100) NOT NULL,
  city VARCHAR(255) NOT NULL,
  town VARCHAR(255) NOT NULL,
  street VARCHAR(255) NOT NULL,
  building VARCHAR(255) NULL,
  room VARCHAR(100) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  is_default BOOLEAN DEFAULT FALSE,
  billing_same BOOLEAN DEFAULT TRUE,
  billing_first_name VARCHAR(100) NULL,
  billing_last_name VARCHAR(100) NULL,
  billing_first_name_kana VARCHAR(100) NULL,
  billing_last_name_kana VARCHAR(100) NULL,
  billing_postal_code VARCHAR(20) NULL,
  billing_prefecture VARCHAR(100) NULL,
  billing_city VARCHAR(255) NULL,
  billing_town VARCHAR(255) NULL,
  billing_street VARCHAR(255) NULL,
  billing_building VARCHAR(255) NULL,
  billing_room VARCHAR(100) NULL,
  billing_phone VARCHAR(50) NULL,
  billing_email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE carts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cart_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cart_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_cart_product (cart_id, product_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  status ENUM('processing','paid','shipped','delivered','cancelled') NOT NULL DEFAULT 'processing',
  total INT NOT NULL DEFAULT 0,
  shipping_address_id BIGINT NULL,
  billing_address_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_shipping_address FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_billing_address FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_snapshot INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order_product (order_id, product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初期データ
INSERT INTO users (id, name, email, login_id, password, phone)
VALUES (1, '佐藤 伸', 'shin@example.com', 'shin', 'password123', '090-1234-5678')
ON DUPLICATE KEY UPDATE name=VALUES(name), login_id=VALUES(login_id), password=VALUES(password), phone=VALUES(phone);

INSERT INTO products (id, slug, name, description, price, stock, category)
VALUES
  (1,'poncho-urban','Urban Storm Poncho','ビジネスバッグも覆うロング丈。耐水圧20,000mmの3層素材でタウンユースに最適。',13800,28,'ポンチョ'),
  (2,'poncho-trail','Trail Packable Poncho','山行でも使える軽量パッカブル。ヒップカットで自転車やハイクにも◎。',15800,16,'ポンチョ'),
  (3,'poncho-city','City Commuter Poncho','通勤に馴染むマット質感。フロントジップとマグネット開閉で着脱がスムーズ。',11800,36,'ポンチョ'),
  (4,'poncho-lite','Lite Travel Poncho','旅行やフェスにぴったりの軽量モデル。ポーチ付きでコンパクトに収納。',9800,44,'ポンチョ')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),price=VALUES(price),stock=VALUES(stock),category=VALUES(category);

INSERT INTO uploads (product_id, url, is_primary, position)
VALUES
  (1,'/hero/5347_thumbnail.jpg',TRUE,1),
  (1,'/hero/33980500.jpg',FALSE,2),
  (2,'/hero/33980500.jpg',TRUE,1),
  (2,'/hero/5347_thumbnail.jpg',FALSE,2),
  (3,'/hero/33980500.jpg',TRUE,1),
  (3,'/hero/5347_thumbnail.jpg',FALSE,2),
  (4,'/hero/5347_thumbnail.jpg',TRUE,1),
  (4,'/hero/33980500.jpg',FALSE,2)
ON DUPLICATE KEY UPDATE is_primary=VALUES(is_primary), position=VALUES(position);
