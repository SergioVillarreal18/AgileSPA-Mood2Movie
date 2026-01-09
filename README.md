# AgileSPA – Mood2Movie

Mood2Movie is a Single Page Application (SPA) developed as a group project for the **Agile Project Management** course.

The application recommends movies based on the user’s mood and preferences. The project was developed following agile practices such as incremental delivery, iterative development, and collaborative teamwork.

---

## Project Overview

The main objective of this project is to design and implement a simple but functional SPA while applying agile concepts in practice.

The focus is not only on technical implementation, but also on:

- Clear separation of responsibilities  
- Incremental feature development  
- Collaboration within a development team  
- Continuous improvement through iterations  

---

## Application Architecture

The project is composed of two main parts:

### Frontend

- Single Page Application built with modern JavaScript technologies  
- Provides the user interface for mood-based movie selection  
- Communicates with the backend through REST API calls  

### Backend

- REST API developed with FastAPI  
- Processes movie data and generates recommendations  
- Exposes endpoints consumed by the frontend  

---

## Technology Stack

### Frontend
- React  
- Vite  
- JavaScript (ES6+)  
- HTML5 / CSS3  

### Backend
- Python  
- FastAPI  
- Pandas  
- Scikit-learn  
- Sentence Transformers  

---

## Project Structure

```text
AgileSPA-Mood2Movie/
│
├── backend/
│ ├── main.py
│ ├── requirements.txt
│ └── data/
│ ├── movies.csv
│ ├── ratings.csv
│ └── tags.csv
│
├── frontend/
│ ├── src/
│ ├── public/
│ ├── package.json
│ └── vite.config.js
│
└── README.md
```

---

## How to Run the Project Locally

Running the project locally is optional and intended for development or testing purposes.

### Backend (FastAPI)

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:

Windows
  ```bash
  python -m venv venv
  venv\Scripts\activate
  ```
macOS / Linux

 ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
3. Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```
4. Run the server:
  ```bash
  uvicorn main:app --reload
  ```
The backend will be available at:
http://127.0.0.1:8000


### Frontend (React + Vite)

1. Navigate to the frontend folder:
  ```bash
  cd frontend
  ```
2. Install dependencies:
  ```bash
  npm install
  ```
4. Run the development server:
  ```bash
  npm run dev
  ```
The frontend will be available at the URL shown in the terminal, typically at:
http://localhost:5173

---

## Notes

This project is intended for academic purposes and focuses on demonstrating both technical implementation and the application of Agile Project Management concepts.

