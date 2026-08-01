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
- **Frontend App**: served as a static production build through Nginx (not host-published on its
  own port) — access it via `http://eoffice.adminead.com`
- **Nginx Reverse Proxy**: Available at `http://eoffice.adminead.com` (Port 80/443)
- **Database**: Available at `localhost:5433` (for external clients)

## Nginx & Subdomain Configuration (`eoffice.adminead.com`)

The system includes preconfigured Nginx setups for both **Docker Compose** and **Host-level Nginx**.

### 1. Docker Compose Nginx setup (Default)
When starting with `make up` or `docker compose up --build`, the `nginx` container will automatically run and route:
- `http://eoffice.adminead.com/` -> Frontend service (`http://frontend:80`, a static production build)
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

### 4. Deploying to a VPS for public access

`eoffice.adminead.com` is intended to be served from a VPS with a static public IP (not a laptop),
so it stays reachable without any port-forwarding or tunneling setup. See
[DEPLOYMENT.md](DEPLOYMENT.md) for the full, step-by-step guide — provisioning the VPS, initial
server hardening, copying the project over, production environment configuration, pointing DNS at
the VPS, and issuing/renewing the SSL certificate.

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
