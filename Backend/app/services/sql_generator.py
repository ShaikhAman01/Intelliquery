from typing import Dict, Optional

class SimpleSQLGenerator:
    """
    Phase 1: Template-based SQL generation
    Handles only basic queries using pattern matching
    """
    
    def __init__(self):
        self.patterns = {
            "show all": self._handle_show_all,
            "list": self._handle_show_all,
            "get all": self._handle_show_all,
            "count": self._handle_count,
            "how many": self._handle_count,
        }
        
        self.table_mapping = {
            "product": "products",
            "products": "products",
            "item": "products",
            "items": "products",
            
            "user": "users",
            "users": "users",
            "customer": "users",
            "customers": "users",
            
            "order": "orders",
            "orders": "orders",
            "purchase": "orders",
            "purchases": "orders",
            
            "category": "categories",
            "categories": "categories",
            
            "review": "reviews",
            "reviews": "reviews",
            "rating": "reviews",
            "ratings": "reviews",
        }
    
    def generate(self, query: str) -> Optional[str]:
        """
        Generate SQL from natural language query
        
        Args:
            query: Natural language query string
            
        Returns:
            SQL string or None if pattern not recognized
        """
        query_lower = query.lower().strip()
        
        for pattern, handler in self.patterns.items():
            if pattern in query_lower:
                return handler(query_lower)
        
        return None
    
    def _extract_table_name(self, query: str) -> str:
        """Extract and normalize table name from query"""
        for synonym, actual_table in self.table_mapping.items():
            if synonym in query:
                return actual_table
        
        return "products"
    
    def _handle_show_all(self, query: str) -> str:
        """Handle 'show all X' queries"""
        table = self._extract_table_name(query)
        return f"SELECT * FROM {table} LIMIT 20"
    
    def _handle_count(self, query: str) -> str:
        """Handle 'count X' or 'how many X' queries"""
        table = self._extract_table_name(query)
        return f"SELECT COUNT(*) as count FROM {table}"


sql_generator = SimpleSQLGenerator()