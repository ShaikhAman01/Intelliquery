from sqlalchemy import Column, BigInteger, String, Integer, Numeric, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    city = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id"))
    price = Column(Numeric(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    orders = relationship("Order", back_populates="product")
    reviews = relationship("Review", back_populates="product")


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"))
    product_id = Column(BigInteger, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    order_date = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
    product = relationship("Product", back_populates="orders")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(BigInteger, primary_key=True, index=True)
    product_id = Column(BigInteger, ForeignKey("products.id"))
    user_id = Column(BigInteger, ForeignKey("users.id"))
    rating = Column(Integer, CheckConstraint("rating >= 1 AND rating <= 5"))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")