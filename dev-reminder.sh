#!/bin/bash

echo "🚨 REMINDER: Always run 'npm run dev' in the /goodvote-app folder!"
echo "Current directory: $(pwd)"
echo ""
echo "To start the development server correctly:"
echo "  cd goodvote-app && npm run dev"
echo ""
echo "Or use this shortcut:"
echo "  ./dev-reminder.sh start"
echo ""

if [ "$1" = "start" ]; then
    echo "Starting development server in correct directory..."
    cd goodvote-app && npm run dev
else
    echo "Please run: cd goodvote-app && npm run dev"
fi 