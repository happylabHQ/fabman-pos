#!/bin/bash

# Exit if any command fails
set -e

# Default Raspberry Pi IPs
DEFAULT_PI_IPS=(
    "192.168.0.19"  # Büro POS
    "192.168.0.254" # Lounge POS
    "192.168.1.16"  # 24/7 POS
)

deploy_to_pi() {
    local PI_IP=$1

    # Use rsync to upload everything to the Raspberry Pi
    echo "Uploading app to Raspberry Pi ${PI_IP}..."
    rsync -avz --exclude=node_modules --exclude=.git --exclude=src --exclude=.env . pi@${PI_IP}:~/fabman-pos

    # Run commands on the remote server
    echo "Restarting micropos.service on the Raspberry Pi ${PI_IP}..."
    ssh pi@${PI_IP} 'sudo systemctl restart micropos.service'

    # Wait for 2 seconds
    echo "Waiting for 2 seconds..."
    sleep 2

    echo "Sending F5 key press to xdotool on the Raspberry Pi ${PI_IP}..."
    ssh -t pi@${PI_IP} 'DISPLAY=:0 xdotool key F5'

    echo "Deploy to ${PI_IP} finished successfully!"
}

# Check for IP address argument
if [ $# -eq 0 ]; then
    echo "No IP provided, using default IPs..."

    # Build the Vue app
    echo "Building Vue app..."
    npm run build

    for IP in "${DEFAULT_PI_IPS[@]}"; do
        deploy_to_pi $IP
    done
else
    # Build the Vue app
    echo "Building Vue app..."
    npm run build

    deploy_to_pi $1
fi
