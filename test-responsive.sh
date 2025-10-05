#!/bin/bash

# Test responsive design at different viewport sizes

echo "Opening Token Bowl at different viewport sizes..."

# Open mobile viewport (375px width)
google-chrome --new-window --window-size=375,812 --window-position=0,0 "http://localhost:5176" &

# Wait a moment
sleep 2

# Open desktop viewport (1440px width)
google-chrome --new-window --window-size=1440,900 --window-position=400,0 "http://localhost:5176" &

echo "Chrome windows opened at:"
echo "- Mobile: 375x812px"
echo "- Desktop: 1440x900px"
echo ""
echo "Test all pages:"
echo "- Home: /"
echo "- Teams: /teams"
echo "- Draft: /draft"
echo "- Scoring: /scoring"
echo "- Videos: /videos"