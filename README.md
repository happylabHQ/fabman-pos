# Fabman Point of Sale (POS) System

## Features

- This is a minimal Point of Sale (POS) system, focusing on simplicity and effectiveness.
- Vendhq integration: The system integrates with Vendhq for inventory management.
- Fabman integration: Payments are processed via the Fabman API.
- Future plans: In the future, integration with other backends such as Google Sheets is planned.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Node.js and npm.
    ```
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

    NODE_MAJOR=20
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

    sudo apt-get update
    sudo apt-get install nodejs -y
    ```
- You have a basic understanding of JavaScript and Node.js.

## Installation

To get the Fabman POS up and running, follow these steps:

1. **Clone the repository:** Use `git clone https://github.com/happylabHQ/fabman-pos.git` to clone this repository to your local machine.
2. **Install dependencies:** Navigate to the root of the project directory and run `npm install` to install the necessary dependencies.
3. **Configure environment variables:** Copy the `.env.example` file to `.env` and update it with the necessary credentials.
4. **Build the Vue.js application:** Use the command `npm run build` to build the Vue.js application.
5. **Run the server:** Start the server using `node backend.js`.

Now, you should be able to open your browser and access the Fabman POS at `http://localhost:3000`.

During development you can start a development server with hot-reload enabled: `npm run serve` 


## Running on Raspberry Pi

Fabman POS was designed with the intention to be run on a Raspberry Pi with a touchscreen display. Below is an example of how the setup looks:

![HW-Setup](https://github.com/happylabHQ/fabman-pos/assets/1569255/4d9bcbe4-9ca6-43b7-baab-3a98f8ec5810)

In order to run Fabman POS on startup, you will need to create a systemd service:

1. **Create the systemd service file:** Open a file in the `/lib/systemd/system/` directory named `fabman-pos.service` using your preferred text editor.
    ```
    sudo vi /lib/systemd/system/fabman-pos.service
    ```

2. **Add the following content to the file:**
    ```
    [Unit]
    Description=Fabman POS
    After=multi-user.target

    [Service]
    Type=idle
    ExecStart=node /home/pi/fabman-pos/backend.js
    Restart=always
    User=pi
    WorkingDirectory=/home/pi/fabman-pos/

    [Install]
    WantedBy=multi-user.target
    ```

    After adding or changing the file reload systemctl 
    ```
    sudo systemctl daemon-reload
    ```

3. **Enable the service:** Enable the service to be run at startup using the command:
    ```
    sudo systemctl enable fabman-pos.service
    ```
   
4. **Start the service:** You can start the service immediately using the command:
    ```
    sudo systemctl start fabman-pos.service
    ```

After this setup, your Fabman POS will start automatically upon booting up your Raspberry Pi.


To automatically start Chromium in fullscreen (kiosk) mode on the Raspberry Pi, you can modify the `autostart` file of the `lxsession`:

1. **Edit the autostart file:** Open the `autostart` file using your preferred text editor (nano, vim, etc.).
    ```
    sudo vi /etc/xdg/lxsession/LXDE-pi/autostart
    ```

2. **Modify the content of the file:** In the `autostart` file, append the following lines at the end of the file:

    ```
    # Hide mouse cursor
    @unclutter

    @xset s off
    @xset -dpms
    @xset s noblank

    # Start Chromium in kiosk mode
    @chromium-browser --kiosk http://localhost:3000
    ```
    
After saving and exiting the file, Chromium will automatically start in fullscreen mode pointing at `http://localhost:3000` whenever the Raspberry Pi boots up. The additional commands above will also turn off the screen saver, power management, and screen blanking, as well as hide the mouse cursor.

## Contributing to Fabman POS

To contribute to Fabman POS, follow these steps:

1. Fork this repository.
2. Create a branch: `git checkout -b <branch_name>`.
3. Make your changes and commit them: `git commit -m '<commit_message>'`.
4. Push to the original branch: `git push origin <project_name>/<location>`.
5. Create the pull request.

## Contact

If you want to contact me, you can reach me at `<karim.jafarmadar@happylab.at>`.

## License

This project uses the following license: [MIT](https://opensource.org/licenses/MIT).
