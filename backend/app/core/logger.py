import logging
import sys
from app.core.config import settings

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_msg = f"[{record.levelname}] {record.getMessage()}"
        return log_msg

def setup_logger():
    logger = logging.getLogger(settings.PROJECT_NAME)
    logger.setLevel(logging.INFO)
    
    if logger.hasHandlers():
        return logger
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    logger.addHandler(handler)
    return logger

logger = setup_logger()