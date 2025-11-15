# 🚀 How to View Your Website on GitHub

I've created a GitHub Actions workflow that will automatically build and deploy your Foam Works Party Co website!

## ✅ What's Been Set Up

A workflow file has been created at `.github/workflows/deploy.yml` that will:
- ✅ Automatically build your app when you push to GitHub
- ✅ Create a preview deployment
- ✅ Deploy to GitHub Pages (frontend preview)

---

## 📋 Quick Start (3 Steps)

### Step 1: Push to GitHub

If you haven't already, push this project to GitHub:

```bash
git init
git add .
git commit -m "Initial commit - Foam Works Party Co"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under "Build and deployment", select **Source: GitHub Actions**
4. Save

### Step 3: Watch It Deploy!

- Go to the **Actions** tab in your repository
- You'll see the workflow running automatically
- Once complete (green checkmark ✅), your site will be live at:
  
  **`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`**

---

## 🎯 What Gets Deployed

### GitHub Pages Deployment
- **Frontend only** (HTML, CSS, JavaScript)
- Great for **previewing the design** and user interface
- ⚠️ Backend features (booking form, database) won't work on GitHub Pages

### To Deploy Full App (with Backend + Database)

For a fully working website, you'll need to deploy to a platform that supports:
- Node.js backend
- PostgreSQL database

**Recommended Platforms:**

1. **Railway** (Easiest) - [railway.app](https://railway.app)
   - Connect GitHub repo
   - Auto-detects everything
   - Free tier available

2. **Render** - [render.com](https://render.com)
   - Free PostgreSQL database
   - Easy GitHub integration
   - Auto-deploys on push

3. **Vercel + Neon Database**
   - Vercel for frontend/API
   - Neon for PostgreSQL
   - Both have free tiers

---

## 📁 Files Created

```
.github/
  workflows/
    deploy.yml          # Auto-deployment workflow
  DEPLOY.md            # Detailed deployment guide
GITHUB_SETUP.md        # This file!
```

---

## 🔍 Checking Deployment Status

1. Go to **Actions** tab on GitHub
2. Click on the latest workflow run
3. See build logs and deployment status
4. Green checkmark = Successfully deployed! ✅

---

## 🆘 Need Help?

- **Build failing?** Check the Actions tab for error logs
- **Page not loading?** Wait 2-3 minutes after deployment
- **Backend not working?** GitHub Pages only supports static files - use Railway/Render for full app

---

## 🎉 You're All Set!

Your workflow will now automatically:
- ✅ Build on every push to `main`
- ✅ Run quality checks
- ✅ Deploy to GitHub Pages
- ✅ Show you any errors in the Actions tab

**Next:** Push your code and watch it deploy automatically! 🚀
