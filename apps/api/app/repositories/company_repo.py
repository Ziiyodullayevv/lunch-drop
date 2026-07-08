from app.models.company import Company
from app.repositories.base import CrudRepository


class CompanyRepository(CrudRepository[Company]):
    model = Company
