# AgileSPA – Mood2Movie

Mood2Movie is a Single Page Application (SPA) developed as a group project for the **Agile Project Management** course.

The application helps users discover movies based on their mood and preferences, instead of searching by specific titles or actors. The project was developed following agile principles, emphasizing incremental delivery, iterative improvement, and close collaboration within the team.

---

## Project Overview

The main objective of this project is to design and implement a simple yet functional SPA, while applying Agile Project Management concepts in a practical and realistic way.

Beyond the technical implementation, the project focuses on:

- Clear separation of responsibilities between frontend and backend
- Incremental feature development using small, manageable tasks
- Collaboration within a cross-functional development team
- Continuous improvement through feedback and iteration

---

## Application Architecture

The application follows a client–server architecture and is composed of two main parts:

### Frontend (SPA)

- Single Page Application built with modern JavaScript technologies
- Provides an intuitive user interface for mood-based movie discovery
- Includes features such as movie search, genre browsing, watchlist management, and user feedback
- Communicates with the backend through REST API calls

### Backend

- REST API developed with FastAPI
- Loads and processes movie datasets
- Implements the recommendation logic based on text similarity
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
- Pandas (data processing)
- Scikit-learn (TF-IDF vectorization and cosine similarity)

### API & Server 
- Uvicorn (ASGI server for FastAPI)  

### Data Source
- CSV datasets: movies.csv, ratings.csv, tags.csv

### Client-side Storage
- Browser LocalStorage (watchlist and watched movies)

### Deployment
- Frontend: Vercel
- Backend: Render

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

## Application Features

- Mood-based movie search using free-text input
- Movie recommendations based on tags, genres, and ratings
- Top genres view with ranked movies
- Personal watchlist and watched list stored in the browser
- Feedback section allowing users to submit comments about the application
- Responsive and user-friendly interface

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

## Deployment
The application is deployed and publicly accessible:

- Frontend (Vercel):
https://mood2movie-agilespa.vercel.app/

- Backend (Render):
https://mood2movie-backend.onrender.com/

---

## Notes

This project is intended for academic purposes and focuses on demonstrating both technical implementation and the application of Agile Project Management concepts.

