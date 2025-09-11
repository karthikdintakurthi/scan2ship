#!/bin/bash

# Script to view cron job logs with filtering
echo "🔍 Cron Job Logs Viewer"
echo "======================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Available log filters:"
echo "1. All cron tracking logs"
echo "2. Delhivery API logs only"
echo "3. Error logs only"
echo "4. Recent logs (last 50 lines)"
echo ""

read -p "Select option (1-4): " choice

case $choice in
    1)
        echo "📊 Showing all cron tracking logs..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm run dev 2>&1 | grep -E "\[CRON_TRACKING|\[DELHIVERY_BULK"
        ;;
    2)
        echo "🌐 Showing Delhivery API logs only..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm run dev 2>&1 | grep -E "\[DELHIVERY_BULK"
        ;;
    3)
        echo "❌ Showing error logs only..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm run dev 2>&1 | grep -E "❌|ERROR|Failed"
        ;;
    4)
        echo "📄 Showing recent logs (last 50 lines)..."
        echo ""
        npm run dev 2>&1 | tail -50
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac
