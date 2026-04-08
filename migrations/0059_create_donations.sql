CREATE TABLE donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    donor_email VARCHAR(255),
    created_at DATETIME NOT NULL
);