# The Gilded Spoon - Restaurant Reservation System
The Gilded Spoon is a full-stack restaurant reservation system featuring a visual booking interface for clients and a comprehensive dashboard for administrators.

Features
Client Authentication: Secure client registration and login.

Visual Seating Plan: Interactive, animated floor plan for visual table booking.

Customer Booking Management: Customer portal to view booking status and cancel reservations.

Admin Dashboard: Admin dashboard with at-a-glance booking statistics.

Booking Management: Admin controls to accept, reject, or delete bookings.

Real-time Availability: Real-time table availability to prevent double bookings.

Tech Stack
Frontend: HTML5, CSS3, JavaScript (ES6+)

Backend: Python with Flask framework

Database: MySQL

Python Libraries: Flask-SQLAlchemy, Flask-Cors, Werkzeug, PyMySQL

Project Structure
/
├── backend/        # Contains the Flask server, database models, and API logic
└── frontend/       # Contains all client-facing HTML, CSS, and JavaScript files

Setup and Installation
1. Prerequisites
Python 3.8 or newer

pip (Python package installer)

MySQL Server

2. Database Setup
Ensure your MySQL server is running.

Execute the final_sql_20250807_v2 script to create the restaurant_db database and tables.

3. Backend Setup
Navigate to the backend directory:
cd backend

Create and activate a virtual environment:

# For Windows
python -m venv venv
.\venv\Scripts\activate

# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

Install the required packages:
pip install -r requirements.txt

Configure DB credentials in the "Database Connection Setup" section of app.py.

Run the Flask Server:
python app.py
(The server will run on http://127.0.0.1:5000)

4. Frontend Setup
Open frontend/login.html in your web browser.

How to Use
Client Flow
Open login.html to register or log in.

On the reservation page, select a date, time, and desired table(s).

Fill in your details and confirm the reservation.

Use the "My Bookings" button to view or cancel reservations.

Admin Flow
From login.html, click the "Admin Login" button.

Use the credentials admin / admin123.

Manage all bookings from the admin dashboard.
