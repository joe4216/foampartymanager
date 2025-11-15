# GitHub Deployment Guide

This guide explains how to deploy your Foam Works Party Co website using GitHub.

## 🚀 Quick Setup

### Option 1: GitHub Pages (Frontend Only - Static Preview)

This deploys only the frontend as a static site preview:

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under "Build and deployment", select **GitHub Actions** as the source
   - The workflow will automatically deploy on every push to `main`

3. **View your site**
   - After the workflow completes, your frontend will be at:
   - `https://<your-username>.github.io/<repo-name>/`

⚠️ **Important**: GitHub Pages only hosts the frontend (HTML/CSS/JS). The backend API and database features won't work. This is best for previewing the design.

---

### Option 2: Full-Stack Deployment (Recommended)

For a fully functional website with backend and database, use one of these platforms:

#### **Railway** (Easiest)
1. Connect your GitHub repository to Railway
2. Add PostgreSQL addon
3. Railway auto-detects Node.js and deploys
4. Set environment variable: `DATABASE_URL` (auto-configured)

#### **Render**
1. Create new Web Service from GitHub
2. Add PostgreSQL database
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variable: `DATABASE_URL`

#### **Vercel** (Frontend) + **Neon** (Database)
1. Deploy frontend to Vercel
2. Create database at [Neon.tech](https://neon.tech)
3. Add backend API routes to Vercel serverless functions
4. Set `DATABASE_URL` in Vercel environment variables

---

## 📁 Repository Structure

```
.github/
  workflows/
    deploy.yml          # Auto-runs on push to build & deploy
client/                 # Frontend React app
server/                 # Backend Express API
shared/                 # Shared types/schemas
package.json           # Dependencies
```

---

## 🔧 Environment Variables Needed

For full deployment, set these environment variables:

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-random-secret-key-here
NODE_ENV=production
```

---

## 🎯 Workflow Status

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:

✅ **On every push:**
- Build the application
- Run tests (if configured)
- Create build artifacts

✅ **On push to `main`:**
- Deploy frontend to GitHub Pages
- Create deployment preview

You can view workflow runs in the **Actions** tab of your GitHub repository.

---

## 🆘 Troubleshooting

### Build fails
- Check the Actions tab for error logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### GitHub Pages not working
- Confirm Pages is enabled in Settings
- Check that the workflow completed successfully
- Wait 2-3 minutes for DNS propagation

### Database connection errors
- GitHub Pages doesn't support backend/databases
- Use Railway/Render for full-stack hosting
- Verify `DATABASE_URL` is set correctly

---

## 📚 Next Steps

1. ✅ Push code to GitHub
2. ✅ Enable GitHub Actions (automatic)
3. ✅ Choose deployment platform
4. ✅ Set environment variables
5. ✅ Deploy and test!

For questions, check the workflow logs in the Actions tab.
