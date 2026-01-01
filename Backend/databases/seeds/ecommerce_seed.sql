-- Categories (5)
INSERT INTO categories (name) VALUES 
('Electronics'),
('Clothing'),
('Books'),
('Home'),
('Sports');

-- Users (10)
INSERT INTO users (name, email, city) VALUES 
('Rahul Sharma', 'rahul@email.com', 'Mumbai'),
('Priya Singh', 'priya@email.com', 'Delhi'),
('Arjun Patel', 'arjun@email.com', 'Bangalore'),
('Ananya Reddy', 'ananya@email.com', 'Hyderabad'),
('Vikram Kumar', 'vikram@email.com', 'Chennai'),
('Sneha Gupta', 'sneha@email.com', 'Pune'),
('Rohan Mehta', 'rohan@email.com', 'Mumbai'),
('Kavya Iyer', 'kavya@email.com', 'Bangalore'),
('Aditya Joshi', 'aditya@email.com', 'Delhi'),
('Ishita Verma', 'ishita@email.com', 'Mumbai');

-- Products (20) - Mix across categories
INSERT INTO products (name, category_id, price, stock_quantity) VALUES 
-- Electronics
('iPhone 15', 1, 79999.00, 50),
('Samsung Galaxy S24', 1, 69999.00, 30),
('Sony Headphones', 1, 8999.00, 100),
('MacBook Pro', 1, 199999.00, 15),
-- Clothing
('Nike T-Shirt', 2, 1299.00, 200),
('Levi Jeans', 2, 2999.00, 150),
('Adidas Shoes', 2, 4999.00, 80),
-- Books
('Atomic Habits', 3, 499.00, 500),
('The Alchemist', 3, 299.00, 300),
('Rich Dad Poor Dad', 3, 399.00, 400),
-- Home
('Coffee Maker', 4, 3499.00, 60),
('Bed Sheet Set', 4, 1299.00, 120),
('Table Lamp', 4, 899.00, 90),
-- Sports
('Football', 5, 799.00, 100),
('Cricket Bat', 5, 2499.00, 50),
('Yoga Mat', 5, 699.00, 150),
('Dumbbells 5kg', 5, 1499.00, 70),
('Tennis Racket', 5, 3999.00, 40),
('Basketball', 5, 1299.00, 80),
('Swimming Goggles', 5, 599.00, 200);

-- Orders (15)
INSERT INTO orders (user_id, product_id, quantity, total_amount, order_date) VALUES 
(1, 1, 1, 79999.00, NOW() - INTERVAL '5 days'),
(2, 5, 2, 2598.00, NOW() - INTERVAL '3 days'),
(3, 8, 1, 499.00, NOW() - INTERVAL '10 days'),
(1, 3, 1, 8999.00, NOW() - INTERVAL '2 days'),
(4, 11, 1, 3499.00, NOW() - INTERVAL '7 days'),
(5, 6, 1, 2999.00, NOW() - INTERVAL '15 days'),
(2, 14, 1, 799.00, NOW() - INTERVAL '1 day'),
(6, 2, 1, 69999.00, NOW() - INTERVAL '20 days'),
(7, 7, 1, 4999.00, NOW() - INTERVAL '4 days'),
(8, 9, 2, 598.00, NOW() - INTERVAL '12 days'),
(3, 15, 1, 2499.00, NOW() - INTERVAL '6 days'),
(9, 16, 1, 699.00, NOW() - INTERVAL '8 days'),
(10, 13, 1, 899.00, NOW() - INTERVAL '11 days'),
(4, 18, 1, 3999.00, NOW() - INTERVAL '9 days'),
(5, 20, 2, 1198.00, NOW() - INTERVAL '14 days');

-- Reviews (20)
INSERT INTO reviews (product_id, user_id, rating, comment) VALUES 
(1, 1, 5, 'Excellent phone! Camera is amazing.'),
(2, 6, 4, 'Good value for money.'),
(3, 1, 5, 'Best headphones ever!'),
(5, 2, 4, 'Nice quality t-shirt.'),
(6, 5, 3, 'Fit is not perfect.'),
(7, 7, 5, 'Very comfortable shoes.'),
(8, 3, 5, 'Life changing book!'),
(9, 8, 5, 'Must read!'),
(11, 4, 4, 'Makes good coffee.'),
(14, 2, 5, 'Great for practice.'),
(15, 3, 4, 'Good quality bat.'),
(16, 9, 5, 'Perfect for home workouts.'),
(1, 6, 4, 'A bit expensive but worth it.'),
(8, 10, 5, 'Highly recommended.'),
(11, 5, 3, 'Takes time to heat up.'),
(7, 2, 5, 'Love these shoes!'),
(14, 4, 4, 'Good quality football.'),
(2, 5, 5, 'Better than iPhone!'),
(9, 3, 4, 'Inspiring read.'),
(20, 5, 5, 'Clear vision underwater.');