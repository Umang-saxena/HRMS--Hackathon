# in app/models/user.py — inside Employee model class
from sqlalchemy.orm import relationship

leaves = relationship("app.leave.models.Leave", back_populates="employee", lazy="select")
