#!/bin/bash

# Exit if any command fails
set -e

# Check for IP address argument
if [ $# -eq 0 ]
  then
    echo "Please provide the Raspberry Pi's IP address as an argument."
    exit 1
fi

# Store the IP address
PI_IP=$1

# Build the Vue app
echo "Building Vue app..."
npm run build

# Use rsync to upload everything to the Raspberry Pi
echo "Uploading app to Raspberry Pi..."
rsync -avz --exclude=node_modules --exclude=.git --exclude=src --exclude=.env . pi@${PI_IP}:~/fabman-pos

# Run commands on the remote server
echo "Restarting micropos.service on the Raspberry Pi..."
ssh pi@${PI_IP} 'sudo systemctl restart micropos.service'

# Wait for 2 seconds
echo "Waiting for 2 seconds..."
sleep 2

echo "Sending F5 key press to xdotool on the Raspberry Pi..."
ssh -t pi@${PI_IP} 'DISPLAY=:0 xdotool key F5'

echo "Deploy script finished successfully!"
