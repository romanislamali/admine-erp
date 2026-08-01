# Admine ERP System

Admine is a comprehensive ERP (Enterprise Resource Planning) system built with **Node.js**, **Express.js**, and **React**. It is designed to manage construction projects, contractors, billing, and user access control.

## Features

- **User Management**: Secure authentication with role-based access control (Admin, Manager, Employee).
- **Project Management**: Track project details, budgets, and progress.
- **Contractor Management**: Manage contractor information and contracts.
- **Billing & Payments**: Handle client billing and contractor payments.
- **Modern UI**: Clean, responsive interface with dark mode support.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose

## Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Installation & Setup

1.  **Clone the repository** (if you haven't already).

2.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

3.  **Install backend dependencies**:
    ```bash
    npm install
    ```

4.  **Configure the environment**:
    - Copy the example environment file:
      ```bash
      cp .env.example .env
      ```
    - Edit `.env` to set your database credentials and server port.

5.  **Start the application**:
    ```bash
    docker-compose up --build
    ```

## Usage

Once the containers are running:

- **Backend API**: Available at `http://localhost:3001`
- **Frontend App**: Available at `http://localhost:5180`
- **Nginx Reverse Proxy**: Available at `http://eoffice.adminead.com` (Port 80/443)
- **Database**: Available at `localhost:5433` (for external clients)

## Nginx & Subdomain Configuration (`eoffice.adminead.com`)

The system includes preconfigured Nginx setups for both **Docker Compose** and **Host-level Nginx**.

### 1. Docker Compose Nginx setup (Default)
When starting with `make up` or `docker compose up --build`, the `nginx` container will automatically run and route:
- `http://eoffice.adminead.com/` -> Frontend service (`http://frontend:5180`)
- `http://eoffice.adminead.com/api/` -> Backend API service (`http://backend:3000`)

To test Nginx configuration syntax:
```bash
make nginx-test
```
To reload Nginx without downtime:
```bash
make nginx-reload
```

### 2. Standalone Host Nginx setup
If you prefer running Nginx on the host OS:
```bash
sudo cp nginx/eoffice.adminead.com.conf /etc/nginx/sites-available/eoffice.adminead.com
sudo ln -s /etc/nginx/sites-available/eoffice.adminead.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL / HTTPS Setup (Certbot)
To issue free SSL certificates with Let's Encrypt / Certbot:
```bash
sudo certbot --nginx -d eoffice.adminead.com
```

### 4. Public access from a laptop via Cloudflare Tunnel

Since a laptop usually has no static public IP and shouldn't have inbound ports forwarded on its
router, this project exposes `eoffice.adminead.com` publicly using a **Cloudflare Tunnel** instead.
`cloudflared` opens an outbound-only connection from the laptop to Cloudflare, so nothing needs to
be forwarded and the home network is never directly reachable from the internet. Cloudflare also
terminates HTTPS for you, so Certbot isn't needed for this path.

**One-time account setup (Cloudflare dashboard):**
1. Add `adminead.com` as a site on [Cloudflare](https://dash.cloudflare.com) (free plan) and switch
   your domain's nameservers at your registrar to the two Cloudflare gave you.
2. In the Cloudflare dashboard, go to **Zero Trust -> Networks -> Tunnels -> Create a tunnel**,
   choose **Cloudflared**, and name it (e.g. `admine-erp`).
3. Under **Route Traffic**, add a **Public hostname**:
   - Subdomain: `eoffice`, Domain: `adminead.com`
   - Service: `HTTP` -> `nginx:80` (the Docker service name/port, since cloudflared runs on the same
     Docker network)
4. Copy the tunnel token shown on the install step (Docker tab).

**Local setup:**
1. Put the token in `backend/.env`:
   ```
   CLOUDFLARE_TUNNEL_TOKEN=your_token_here
   ```
2. Start (or restart) the stack:
   ```bash
   make up
   ```
   This also starts the `cloudflared` service, which connects out to Cloudflare and forwards
   `eoffice.adminead.com` traffic to the `nginx` container.
3. Visit `https://eoffice.adminead.com` from any device with internet access — no VPN, hosts file
   edit, or port forwarding required.

## Project Structure

```
admine-erp/
├── backend/          # Node.js/Express backend
│   ├── config/       # Database configuration
│   ├── controllers/  # Request handlers
│   ├── routes/       # API routes
│   ├── models/       # Database models
│   └── server.js     # Application entry point
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── context/    # React Context providers
│   │   └── services/   # API service functions
│   └── vite.config.ts  # Vite configuration
├── docker-compose.yml  # Docker orchestration
├── .env                # Environment variables
└── README.md           # Project documentation
```

## License

MIT
