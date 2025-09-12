# 🚀 Production Deployment Guide for Scalable Cron Job

## 📊 Current Status After Your Deployment

### ✅ **What's Already Deployed:**
- New scalable cron job code at `/api/cron/scalable-update-tracking`
- Updated `cron-config.json` to use new endpoint
- Updated `vercel.json` to use new endpoint

### ⚠️ **What Still Needs to be Done:**
1. **Deploy the updated `vercel.json`** (this is the key!)
2. **Set up CRON_SECRET environment variable**
3. **Test the new cron job**

## 🔄 **Step-by-Step Deployment Process**

### **Step 1: Deploy Updated vercel.json**
```bash
# Commit and push the updated vercel.json
git add vercel.json
git commit -m "Update cron job to use scalable version"
git push origin main
```

### **Step 2: Set Up Environment Variable**
In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add: `CRON_SECRET` = `your-secure-cron-secret-key-here`

### **Step 3: Verify Deployment**
The new cron will start running automatically after deployment.

## ⏰ **When Will the New Cron Trigger?**

### **Automatic Triggering:**
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **First Run**: Within 5 minutes of deployment
- **Endpoint**: `https://www.scan2ship.in/api/cron/scalable-update-tracking`

### **Manual Testing:**
You can test immediately without waiting:
```bash
# Test the new cron job manually
curl -X POST https://www.scan2ship.in/api/cron/scalable-update-tracking \
  -H "Authorization: Bearer your-secure-cron-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"batchNumber": 1, "totalBatches": 10}'
```

## 📊 **Expected Behavior**

### **First Run (Batch 1):**
- Processes 5 clients
- Up to 500 orders (5 clients × 100 orders each)
- Logs detailed progress

### **Subsequent Runs:**
- Continues with next batches
- Processes remaining clients
- Maintains order prioritization

## 🔍 **How to Monitor**

### **Check Vercel Function Logs:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Functions" tab
4. Look for `/api/cron/scalable-update-tracking`

### **Expected Log Messages:**
```
🔄 [SCALABLE_CRON_xxx] Starting scalable tracking update job...
🏢 [SCALABLE_CRON_xxx] Processing client: [Client Name] (client-id)
📦 [SCALABLE_CRON_xxx] Found X orders to process for client: [Client Name]
✅ [SCALABLE_CRON_xxx] Batch 1/10 completed
```

## 🚨 **Troubleshooting**

### **If Cron Doesn't Start:**
1. **Check Environment Variable**: Ensure `CRON_SECRET` is set
2. **Check vercel.json**: Verify the path is correct
3. **Check Deployment**: Ensure latest code is deployed

### **If You Get 401 Unauthorized:**
- The `CRON_SECRET` environment variable is not set correctly
- Update it in Vercel dashboard

### **If You Get 500 Errors:**
- Check Vercel function logs for specific error messages
- Ensure database connection is working

## 🔄 **Rollback Plan**

If you need to switch back to the old cron:
```bash
# Update vercel.json to use old cron
# Change path back to: "/api/cron/update-tracking-optimized"
# Deploy the change
```

## 📈 **Performance Expectations**

### **New Scalable Cron:**
- **Orders per Run**: 500 (vs 200 in old cron)
- **Clients per Run**: 5 (vs all at once)
- **Timeout Risk**: Low (vs high in old cron)
- **Total Capacity**: 5,000 orders (with 10 batches)

### **Timeline:**
- **Batch 1**: 0-5 minutes after deployment
- **Batch 2**: 5-10 minutes after deployment
- **All Batches**: Complete within 50 minutes

## 🎯 **Next Steps**

1. **Deploy now**: Push the updated `vercel.json`
2. **Set environment variable**: Add `CRON_SECRET` in Vercel
3. **Monitor first run**: Check logs in 5 minutes
4. **Verify results**: Check if more orders are being processed
5. **Adjust if needed**: Modify batch sizes based on performance
