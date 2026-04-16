# 🚀 QUICK START GUIDE - Luminex Bot Deployment

**Estimated Time: 15-30 minutes**

---

## Step 1: Install Dependencies ⚙️

```bash
cd /Users/necatieminkars/Documents/Luminex
npm install
```

Expected output: `added 34 packages, removed 10 packages, changed 30 packages`

---

## Step 2: Set Up Environment Variables 🔐

**Copy the example file**:
```bash
cp .env.example .env
```

**Edit .env with your values**:
```bash
nano .env
# or use your favorite editor
```

**Required fields** (without these, bot will NOT start):
```env
DISCORD_TOKEN=your_discord_bot_token
OWNER_ID=your_discord_user_id
MONGO_URI=mongodb://localhost:27017/luminex
```

**For Dashboard OAuth2** (required for dashboard):
```env
DISCORD_CLIENT_ID=your_oauth_app_client_id
DISCORD_CLIENT_SECRET=your_oauth_app_client_secret
SESSION_SECRET=change-me-to-a-random-secure-string
```

**For AI Services** (at least ONE required):
```env
# Option 1: Local Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=neural-chat

# OR Option 2: OpenRouter
OPENROUTER_API_KEY=sk-...

# OR Option 3: Google Gemini
GEMINI_API_KEY=AIza...
```

---

## Step 3: Get Discord Credentials 🤖

### A. Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" section → Click "Add Bot"
4. Under TOKEN → Click "Copy" 
5. Paste into .env as `DISCORD_TOKEN=...`

Your bot permissions should have:
- Send Messages
- Embed Links
- Manage Messages
- Read Message History

### B. OAuth2 Credentials (for Dashboard)
1. In your Discord Application settings
2. Go to "OAuth2" → "General"
3. Under "CLIENT ID" → Copy to .env as `DISCORD_CLIENT_ID=...`
4. Under "CLIENT SECRET" → Copy to .env as `DISCORD_CLIENT_SECRET=...`
5. Add Redirect URL: `http://localhost:3000/auth/callback`

---

## Step 4: Set Up AI Service 🧠

### Option A: Ollama (Local, Recommended for Development)

```bash
# Install Ollama from: https://ollama.ai

# Then download a model:
ollama pull neural-chat

# Start Ollama in background:
ollama serve
# It will run on http://localhost:11434
```

### Option B: OpenRouter (Cloud-based, Easiest)

1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up and get API key
3. Add to .env: `OPENROUTER_API_KEY=sk-...`

### Option C: Google Gemini

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to .env: `GEMINI_API_KEY=AIza...`

---

## Step 5: Set Up MongoDB 🗄️

### Option A: Local MongoDB
```bash
# Install MongoDB Community Edition: https://docs.mongodb.com/manual/installation/

# On macOS using Homebrew:
brew install mongodb-community
brew services start mongodb-community
```

### Option B: MongoDB Atlas (Cloud)
```
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create a cluster
4. Get connection string
5. Add to .env: MONGO_URI=mongodb+srv://...
```

If using local MongoDB, your .env will have:
```env
MONGO_URI=mongodb://localhost:27017/luminex
```

---

## Step 6: Start the Bot 🎮

```bash
npm start
```

You should see:
```
✅ Bot connected as: YourBotName#0000
🌐 Web paneli http://localhost:3000 adresinde aktif.
[CONFIG] 📋 Configuration Summary:
  Bot Owner ID: 123456789
  Dashboard: http://localhost:3000
  MongoDB: ✅ Configured
  Ollama: ✅ http://localhost:11434
```

---

## Step 7: Test the Bot 🧪

### Test 1: Make sure bot is online
- Go to your Discord server
- Bot should show as online

### Test 2: Test eval() sandbox
```
/eval 2+2
Expected: ✅ Executed in Xms. `4`
```

### Test 3: Test dashboard
```
1. Go to http://localhost:3000
2. Should redirect to http://localhost:3000/auth/login
3. Click "Discord ile Giriş Yap"
4. Authorize with Discord
5. Should see your admin servers
```

### Test 4: Test AI response
```
@YourBotName hello
Expected: AI responds (from Ollama/OpenRouter/Gemini)
```

---

## Step 8: Add Bot to Your Server 🎪

```
1. Go to Discord Developer Portal → Your Application
2. OAuth2 → Copy CLIENT ID
3. Visit: https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=8
4. Select server to add bot
5. Authorize
```

Bot will now appear in your server!

---

## Security Checklist ✅

Before going to production:

- [ ] DISCORD_TOKEN is set and valid
- [ ] OWNER_ID has your Discord ID
- [ ] MONGO_URI points to valid MongoDB
- [ ] MongoDB connection succeeds (check logs)
- [ ] OAuth2 login works (can login to dashboard)
- [ ] At least one AI service is working
- [ ] eval() command is sandboxed (test with 2+2)
- [ ] Dashboard requires authentication (no public access)
- [ ] Error logging is working (check console)

---

## Troubleshooting 🔧

### Bot doesn't start
```
Error: token is required
→ Check DISCORD_TOKEN in .env
```

### MongoDB connection fails
```
Error: connect ECONNREFUSED 127.0.0.1:27017
→ Make sure MongoDB is running: brew services start mongodb-community
```

### Dashboard shows blank/errors
```
Error: OAuth2 credentials not configured
→ Check DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env
```

### AI service not responding
```
[AI_MODEL] Ollama failed
→ Make sure Ollama is running: ollama serve
```

### eval() command blocked
```
Error: Timeout
→ Increase OLLAMA_TIMEOUT in .env or simplify query
```

---

## Command Summary

```bash
# Start bot
npm start

# Install dependencies
npm install

# Check for vulnerabilities
npm audit

# Check logs
tail -f logs/bot.log  # if logging is set up
```

---

## Next Steps 📋

1. ✅ Configure .env
2. ✅ Install dependencies
3. ✅ Set up MongoDB
4. ✅ Set up AI service
5. ✅ Start bot
6. ✅ Test all features
7. ✅ Add to Discord server
8. → Customize bot (add features, change responses)
9. → Deploy to production server
10. → Monitor and maintain

---

## Resources 📚

- **Discord.js Documentation**: https://discord.js.org
- **Ollama**: https://ollama.ai
- **OpenRouter**: https://openrouter.ai
- **MongoDB**: https://docs.mongodb.com
- **GitHub Issues**: Refer to ENHANCEMENT_SUMMARY.md

---

## Support 💬

If you encounter issues:
1. Check error logs (console output)
2. Review relevant section in this guide
3. Check IMPLEMENTATION_SUMMARY.md for details
4. Verify all .env variables are set

**Happy Bot Hosting! 🚀**
