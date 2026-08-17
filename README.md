# PDF Form SaaS Application

A complete SaaS platform that allows users to upload PDF templates, automatically detect fillable form fields, generate dynamic forms for clients, and auto-populate PDFs with submitted data.

## Features

✅ **User Authentication** - Secure registration and login with JWT  
✅ **PDF Template Upload** - Upload PDF files with automatic field detection  
✅ **Field Auto-Detection** - Automatically detect form fields in PDFs  
✅ **Dynamic Form Generation** - Generate web forms from detected PDF fields  
✅ **PDF Population** - Auto-fill PDFs with user-submitted data  
✅ **Submit & Download** - Submit forms and download filled PDFs  
✅ **Submission Management** - View, edit, and delete form submissions  
✅ **Responsive Design** - Mobile-friendly interface  

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **PDF Processing**: pdf-lib, pdfjs-dist, pdf-parse
- **File Upload**: multer

### Frontend
- **Library**: React 18
- **Routing**: React Router v6
- **HTTP Client**: axios
- **Styling**: CSS3
- **Icons**: lucide-react

## Project Structure

```
pdf-form-saas/
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Template.js
│   │   └── Submission.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── templateRoutes.js
│   │   └── submissionRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── pdfProcessor.js
│   └── index.js
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Header.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── UploadTemplate.js
│   │   │   ├── FillForm.js
│   │   │   └── SubmissionsList.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── package.json
├── .env.example
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14+)
- npm or yarn
- MongoDB (running locally or remote connection string)

### Step 1: Clone and Install Dependencies

```bash
cd pdf-form-saas
npm run install-all
```

This will install dependencies for both server and client.

### Step 2: Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pdf-form-saas
JWT_SECRET=your-super-secret-key-change-this
```

### Step 3: Start MongoDB

Make sure MongoDB is running:

```bash
# On macOS with Homebrew
brew services start mongodb-community

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### Step 4: Start the Application

#### Option 1: Run in Development Mode (Separate Terminals)

**Terminal 1 - Backend:**
```bash
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
# App runs on http://localhost:3000
```

#### Option 2: Using Production Build

```bash
# Build the client
npm run build

# Start the server (will serve the built client)
npm start
```

## Usage Guide

### 1. Register & Login
- Visit http://localhost:3000
- Create a new account or login with existing credentials

### 2. Upload PDF Template
- Click "Upload Template" in the navigation
- Select a PDF file with form fields
- The system will automatically detect all fillable fields
- Give it a name and optional description

### 3. Fill & Submit Forms
- From the dashboard, click "Fill Form" on a template
- Fill in all the form fields
- Options:
  - **Save Draft**: Save your progress for later
  - **Download PDF**: Generate and download the filled PDF
  - **Submit Form**: Submit the form (stores in database)

### 4. Manage Submissions
- Click "View" on a template to see all submissions
- Download any submission as a PDF
- Delete submissions as needed

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Templates
- `POST /api/templates/upload` - Upload PDF template (requires auth)
- `GET /api/templates` - Get all templates (requires auth)
- `GET /api/templates/:id` - Get specific template (requires auth)
- `PUT /api/templates/:id` - Update template fields (requires auth)
- `DELETE /api/templates/:id` - Delete template (requires auth)

### Submissions
- `POST /api/submissions` - Create/update submission (requires auth)
- `GET /api/submissions/:id` - Get submission (requires auth)
- `GET /api/submissions/template/:templateId` - Get all submissions for template (requires auth)
- `POST /api/submissions/:id/generate-pdf` - Generate filled PDF (requires auth)
- `PUT /api/submissions/:id` - Update submission (requires auth)
- `DELETE /api/submissions/:id` - Delete submission (requires auth)

## PDF Field Detection

The system uses **pdfjs-dist** to detect form fields in uploaded PDFs. It automatically identifies:
- Text fields
- Checkboxes
- Dropdowns
- Radio buttons

If your PDF has form fields created in Adobe Acrobat or similar tools, they will be automatically detected.

### Supported PDF Types
- ✅ PDFs with AcroForm fields (created in Adobe Acrobat)
- ✅ Interactive PDFs
- ⚠️ PDFs without form fields (falls back to basic field creation)

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running
```bash
mongo # or mongod
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change port in `.env` or kill the process using the port

### PDF Upload Fails
- Ensure file is a valid PDF
- Max file size: 50MB (configurable in `server/index.js`)
- PDF must be readable by pdfjs-dist

### Fields Not Detected
- Try opening the PDF in Adobe Acrobat and ensure form fields are properly created
- Some scanned PDFs may not have proper form fields

## Deployment

### Deploy to Heroku

```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Add MongoDB Atlas
heroku addons:create mongolab:sandbox

# 3. Set environment variables
heroku config:set JWT_SECRET=your-secret-key

# 4. Deploy
git push heroku main
```

### Deploy to AWS, DigitalOcean, or VPS

See the deployment guides in the docs folder for detailed instructions.

## Development Tips

### Adding New Form Field Types
Edit `server/utils/pdfProcessor.js` in the `fillPDF` function to add support for new field types.

### Customizing PDF Detection
Modify `detectPDFFields` function in `server/utils/pdfProcessor.js` to improve field detection logic.

### Styling
All styles are in `client/src/index.css`. Modify CSS variables in `:root` to change the theme.

## Security Considerations

1. **Change JWT_SECRET** in production
2. **Use HTTPS** when deployed
3. **Validate file uploads** (only accept PDFs)
4. **Sanitize user inputs** (consider adding express-validator)
5. **Rate limiting** (add express-rate-limit)
6. **CORS** configuration should be restrictive in production

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments
3. Check MongoDB and Node.js documentation
4. Create an issue on GitHub

## Future Enhancements

- [ ] Email notifications for submissions
- [ ] Advanced field validation
- [ ] Multi-language support
- [ ] Batch PDF generation
- [ ] Template versioning
- [ ] Webhook integrations
- [ ] Advanced analytics
- [ ] Team collaboration features
- [ ] API for third-party integrations

---

Built with ❤️ for automating PDF form workflows.
