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
- **Database**: Available at `localhost:5433` (for external clients)

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
