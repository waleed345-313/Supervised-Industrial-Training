<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:0ea5e9,100:2563eb&text=Supervised%20Industrial%20Training&fontColor=ffffff&fontAlignY=35&desc=Smart%20Internship%20Management%20Platform&descAlignY=55&animation=fadeIn" alt="SIT Banner" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Poppins&weight=600&size=22&duration=3000&pause=700&color=2563EB&center=true&vCenter=true&width=700&lines=Connecting+Students%2C+Universities%2C+and+Industry;Automating+Applications%2C+Placements%2C+and+Evaluations;Improving+Visibility+Across+the+Training+Lifecycle" alt="Typing Animation" />
</p>

<p align="center">
  <a href="https://github.com/waleed345-313/Supervised-Industrial-Training">
    <img src="https://img.shields.io/badge/status-active-success" alt="Status" />
  </a>
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white" alt="Frontend" />
  <img src="https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white" alt="Backend" />
  <img src="https://img.shields.io/badge/database-MongoDB-47A248?logo=mongodb&logoColor=white" alt="Database" />
</p>

## Overview

**Supervised Industrial Training (SIT)** is a web-based internship management platform that connects students, universities, and companies in one workflow.

It helps stakeholders manage:
- Internship applications
- Placement decisions
- Progress and supervision
- Evaluations and final grading
- Communication and reporting

## Key Features

- Role-based dashboards for students, supervisors, placement managers, focal persons, and admins
- Internship posting, application, and assignment workflows
- Evaluation and grading support
- Progress tracking and reporting
- Real-time communication capabilities (Socket.IO integration)

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Socket.IO

## Getting Started

### 1) Clone the repository

```bash
git clone https://github.com/waleed345-313/Supervised-Industrial-Training.git
cd Supervised-Industrial-Training
```

### 2) Frontend setup

```bash
npm install
npm run dev
```

### 3) Backend setup

```bash
cd backend
npm install
npm run dev
```

> Create and configure `.env` files for both frontend and backend before running in production environments.

## Available Scripts

From the project root:

- `npm run dev` — Start frontend dev server
- `npm run build` — Build frontend for production
- `npm run lint` — Run ESLint checks
- `npm run preview` — Preview production frontend build

From the `backend` directory:

- `npm run dev` — Start backend with nodemon
- `npm start` — Start backend with node

## Project Structure

```text
Supervised-Industrial-Training/
├── src/              # Frontend source code
├── backend/          # Node/Express backend
├── public/           # Static assets
└── README.md
```

## Contributing

Contributions are welcome. Please open an issue to discuss major changes before submitting a pull request.

## License

This project is currently unlicensed. Add a license file (e.g., MIT) if you plan to distribute it publicly.
