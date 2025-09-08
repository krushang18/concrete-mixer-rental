#### `docs/API.md`

````markdown
# API Documentation

## Customer Endpoints

### Submit Query

**POST** `/api/customer/query`

Submit a new customer inquiry.

#### Request Body

```json
{
  "company_name": "ABC Construction",
  "email": "contact@abc.com",
  "site_location": "Surat, Gujarat",
  "contact_number": "9876543210",
  "duration": "2 weeks",
  "work_description": "Need concrete mixer for residential project"
}
```
````
