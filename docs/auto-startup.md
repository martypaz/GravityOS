# GravityOS: Auto-Startup & Background Service Guide

To make the GravityOS Control Dashboard always active on your WSL environment without needing to keep a terminal window open, you can configure it to run in the background.

---

## Option 1: Running in the Background via PM2 (Recommended)

Since PM2 is a standard Node.js process manager, it is perfect for running the Next.js development or production server silently in WSL.

1. **Install PM2 globally** (if you haven't already):
   ```bash
   npm install -g pm2
   ```

2. **Navigate to the dashboard directory**:
   ```bash
   cd /home/ubuntu/projects/antigravity/GravityOS/dashboard-ui
   ```

3. **Start the server with PM2**:
   ```bash
   pm2 start npm --name "gravity-os" -- run dev
   ```

4. **Monitor the dashboard**:
   - View running state: `pm2 status`
   - View live output logs: `pm2 logs gravity-os`
   - Restart the server: `pm2 restart gravity-os`
   - Stop the server: `pm2 stop gravity-os`

---

## Option 2: Launching Automatically on WSL Boot

You can configure Windows to start WSL and boot the GravityOS dashboard automatically whenever your PC turns on.

1. **On your Windows Host**, press `Win + R`, type `shell:startup`, and press Enter. This opens your Windows Startup folder.
2. **Create a new shortcut** or text file named `gravity-os.vbs` inside that folder with the following script (this launches WSL silently without popping up a command prompt window):

```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "wsl.exe -d Ubuntu -u ubuntu bash -c 'cd /home/ubuntu/projects/antigravity/GravityOS && ./start-dashboard.sh'", 0, false
```

3. Whenever you boot into Windows, the script will silently launch your WSL instance, run the port checks, and boot up your GravityOS Dashboard at **`http://localhost:3000`** in the background!
