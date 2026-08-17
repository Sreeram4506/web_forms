# Quick Start Guide

Get your PDF Form SaaS application running in 5 minutes!

## Option 1: Using Docker (Easiest)

### Prerequisites
- Docker & Docker Compose installed

### Steps

```bash
# 1. Navigate to project directory
cd pdf-form-saas

# 2. Start with Docker Compose
docker-compose up --build

# 3. Open your browser
# App: http://localhost:5000
# MongoDB: mongodb://admin:password@localhost:27017
```

That's it! The app is running with MongoDB included.

---

## Option 2: Local Development Setup

### Prerequisites
- Node.js v14+ (download from https://nodejs.org/)
- MongoDB running locally or remote

### Step-by-Step

#### 1. Install Dependencies
```bash
cd pdf-form-saas
npm run install-all
```

#### 2. Create `.env` file
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pdf-form-saas
JWT_SECRET=your-secret-key
```

#### 3. Start Backend
```bash
npm run dev
# Backend runs on http://localhost:5000
```

#### 4. Start Frontend (New Terminal)
```bash
cd client
npm start
# Frontend runs on http://localhost:3000
```

---

## 🎯 First Time User Workflow

### 1. Create Account
- Go to http://localhost:3000
- Click "Register"
- Fill in details: Name, Email, Password
- Click "Register"

### 2. Upload a PDF Template
- Click "Upload Template" in navigation
- Select a PDF file (must have form fields)
- Give it a name (e.g., "Application Form")
- Click "Upload Template"
- System automatically detects fields ✓

### 3. Fill the Form
- From dashboard, click "Fill Form" on your template
- Fill in all the input fields
- Click "Download PDF" to get the filled document
- Or click "Submit Form" to save it

### 4. View Submissions
- Click "View" on a template
- See all submitted forms
- Download any submission as PDF
- Delete if needed

---

## 📝 Test with Sample PDF

Don't have a PDF with form fields? Here's how to create one:

### Using Adobe Acrobat
1. Open any PDF in Adobe Acrobat
2. Tools → Prepare Form
3. Add text fields, checkboxes, etc.
4. Save as PDF
5. Upload to the app!

### Online Alternative
- Use https://www.ilovepdf.com/edit-pdf
- Or https://pdfking.io/

---

## 🔑 Default Test Credentials

After setup, you can use these for testing:
- Email: `test@example.com`
- Password: `password123`

(These won't exist until you create an account)

---

## 🛠️ Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
```bash
# Option 1: Start MongoDB
mongod

# Option 2: Update MONGODB_URI in .env
# Use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pdf-form-saas
```

### Port 5000 Already in Use
```bash
# Kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Port 3000 Already in Use
```bash
# In client folder, start on different port
PORT=3001 npm start
```

### Can't Upload PDF
- Check file is valid PDF
- Ensure PDF has form fields
- Max size: 50MB
- Check browser console for errors (F12)

---

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `server/index.js` | Backend entry point |
| `client/src/App.js` | Frontend entry point |
| `server/utils/pdfProcessor.js` | PDF field detection logic |
| `server/routes/submissionRoutes.js` | Form submission API |
| `client/src/pages/FillForm.js` | Form UI |

---

## 🚀 Next Steps

### Customize
- Edit `client/src/index.css` to change colors
- Modify `client/src/components/Header.js` for branding
- Change `JWT_SECRET` in `.env` for production

### Deploy
- **Heroku**: See README.md → Deployment section
- **Docker**: Run `docker build -t pdf-form-saas .`
- **AWS/DigitalOcean**: Deploy Docker container

### Enhance
- Add email notifications
- Implement payment processing
- Add user roles/permissions
- Build API for third-party apps

---

## 📖 Full Documentation

See `README.md` for complete documentation including:
- API endpoints reference
- Database schema
- Security best practices
- Production deployment guides

---

## 💡 Tips

1. **Save PDFs Before Upload**: Make sure your PDF form fields are properly configured
2. **Test First**: Fill a form and download to verify everything works
3. **Use .env**: Keep sensitive data in `.env`, not in code
4. **Check Logs**: Look at terminal output for detailed error messages
5. **Inspect Network**: Use browser DevTools (F12) to see API calls

---

## 🆘 Getting Help

1. **Check Terminal Logs**: First clue to what went wrong
2. **Browser Console**: Press F12, check for JavaScript errors
3. **README.md**: Full documentation and troubleshooting
4. **MongoDB Docs**: https://docs.mongodb.com/
5. **Node.js Docs**: https://nodejs.org/docs/

---

**Ready to go?** Start with Docker above or follow the local development steps. Happy coding! 🎉
