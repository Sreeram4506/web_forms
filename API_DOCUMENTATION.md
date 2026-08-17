# API Documentation

Complete API reference for the PDF Form SaaS application.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Get a token by logging in or registering.

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error (400):**
```json
{
  "message": "User already exists"
}
```

---

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error (401):**
```json
{
  "message": "Invalid credentials"
}
```

---

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Template Endpoints

### Upload PDF Template
Uploads a PDF file and automatically detects form fields.

```http
POST /templates/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "pdf": <file>,
  "name": "Application Form",
  "description": "Customer application form"
}
```

**Response (201):**
```json
{
  "message": "Template uploaded successfully",
  "template": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Application Form",
    "description": "Customer application form",
    "fields": [
      {
        "name": "full_name",
        "type": "text",
        "defaultValue": "",
        "required": true,
        "_id": "507f1f77bcf86cd799439013"
      },
      {
        "name": "email",
        "type": "text",
        "defaultValue": "",
        "required": true,
        "_id": "507f1f77bcf86cd799439014"
      },
      {
        "name": "agree_terms",
        "type": "checkbox",
        "defaultValue": false,
        "required": true,
        "_id": "507f1f77bcf86cd799439015"
      }
    ]
  }
}
```

**Field Types:**
- `text` - Text input field
- `checkbox` - Checkbox field
- `dropdown` - Select/dropdown field

---

### Get All Templates
```http
GET /templates
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "name": "Application Form",
    "description": "Customer application form",
    "pdfPath": "application-form.pdf",
    "fields": [...],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### Get Single Template
```http
GET /templates/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "name": "Application Form",
  "description": "Customer application form",
  "pdfPath": "application-form.pdf",
  "fields": [
    {
      "name": "full_name",
      "type": "text",
      "defaultValue": "",
      "required": true
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

### Update Template Fields
Modify the fields of a template (useful for manual corrections).

```http
PUT /templates/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fields": [
    {
      "name": "full_name",
      "type": "text",
      "defaultValue": "",
      "required": true
    },
    {
      "name": "country",
      "type": "dropdown",
      "defaultValue": "USA",
      "required": false,
      "options": ["USA", "Canada", "Mexico"]
    }
  ]
}
```

**Response (200):**
```json
{
  "message": "Template updated",
  "template": {
    "_id": "507f1f77bcf86cd799439012",
    "fields": [...]
  }
}
```

---

### Delete Template
```http
DELETE /templates/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Template deleted"
}
```

---

## Submission Endpoints

### Create Submission
Creates a new form submission (draft).

```http
POST /submissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateId": "507f1f77bcf86cd799439012",
  "data": {
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "agree_terms": "true"
  },
  "status": "draft"
}
```

**Response (201):**
```json
{
  "message": "Submission created",
  "submission": {
    "id": "507f1f77bcf86cd799439016",
    "templateId": "507f1f77bcf86cd799439012",
    "data": {
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "agree_terms": "true"
    },
    "status": "draft",
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

**Status Values:**
- `draft` - Saved but not yet submitted
- `submitted` - Formally submitted

---

### Get Submission
```http
GET /submissions/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439016",
  "templateId": "507f1f77bcf86cd799439012",
  "data": {
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "agree_terms": "true"
  },
  "status": "draft",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

### Update Submission
```http
PUT /submissions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "full_name": "Jane Smith Updated",
    "email": "jane.new@example.com",
    "agree_terms": "true"
  },
  "status": "submitted"
}
```

**Response (200):**
```json
{
  "message": "Submission updated",
  "submission": {
    "id": "507f1f77bcf86cd799439016",
    "templateId": "507f1f77bcf86cd799439012",
    "data": {...},
    "status": "submitted",
    "updatedAt": "2024-01-15T11:05:00Z"
  }
}
```

---

### Get All Submissions for Template
```http
GET /submissions/template/:templateId
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439016",
    "templateId": "507f1f77bcf86cd799439012",
    "data": {...},
    "status": "submitted",
    "createdAt": "2024-01-15T11:00:00Z"
  },
  {
    "id": "507f1f77bcf86cd799439017",
    "templateId": "507f1f77bcf86cd799439012",
    "data": {...},
    "status": "draft",
    "createdAt": "2024-01-15T12:00:00Z"
  }
]
```

---

### Generate Filled PDF
Generates a PDF file with all form fields filled with submitted data.

```http
POST /submissions/:id/generate-pdf
Authorization: Bearer <token>
```

**Response (200):**
- Returns PDF file as binary data
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="filled-form.pdf"`

**Example with curl:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/submissions/507f1f77bcf86cd799439016/generate-pdf \
  -o filled-form.pdf
```

**Example with JavaScript:**
```javascript
const response = await fetch('/api/submissions/:id/generate-pdf', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filled-form.pdf';
document.body.appendChild(a);
a.click();
```

---

### Delete Submission
```http
DELETE /submissions/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Submission deleted"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Please fill in all required fields"
}
```

### 401 Unauthorized
```json
{
  "message": "No token provided"
}
```

### 401 Invalid Token
```json
{
  "message": "Invalid token"
}
```

### 404 Not Found
```json
{
  "message": "Template not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## Request/Response Examples

### Complete Flow Example

#### 1. Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

#### 2. Upload Template
```bash
curl -X POST http://localhost:5000/api/templates/upload \
  -H "Authorization: Bearer <token>" \
  -F "pdf=@form.pdf" \
  -F "name=Application Form" \
  -F "description=Test form"
```

#### 3. Create Submission
```bash
curl -X POST http://localhost:5000/api/submissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "507f1f77bcf86cd799439012",
    "data": {
      "full_name": "Jane Smith",
      "email": "jane@example.com"
    },
    "status": "draft"
  }'
```

#### 4. Generate PDF
```bash
curl -X POST http://localhost:5000/api/submissions/507f1f77bcf86cd799439016/generate-pdf \
  -H "Authorization: Bearer <token>" \
  -o result.pdf
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production, consider adding:
- `express-rate-limit` middleware
- Limit: 100 requests per 15 minutes per IP

---

## Pagination

Pagination is not currently implemented. For large datasets, consider adding:
- Query parameters: `?page=1&limit=20`
- Response metadata: `{ data: [], total, pages }`

---

## Webhooks

Webhooks are not currently implemented. Future enhancement planned.

---

## API Response Headers

All responses include:
```
Content-Type: application/json
```

---

## Testing the API

### Using Postman
1. Import the API endpoints
2. Set `Bearer <token>` in Authorization tab
3. Test each endpoint

### Using curl
See examples above.

### Using JavaScript/axios
```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Set token
const setToken = (token) => {
  API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Register
const register = (name, email, password) => {
  return API.post('/auth/register', { name, email, password });
};

// Login
const login = (email, password) => {
  return API.post('/auth/login', { email, password });
};

// Upload template
const uploadTemplate = (file, name, description) => {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('name', name);
  formData.append('description', description);
  return API.post('/templates/upload', formData);
};
```

---

**Last Updated:** January 2024  
**API Version:** 1.0
