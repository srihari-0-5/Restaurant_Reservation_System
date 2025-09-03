import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from urllib.parse import quote_plus
from werkzeug.security import generate_password_hash, check_password_hash

# --- App Initialization and Configuration ---
app = Flask(__name__)
CORS(app) 

# --- Database Connection Setup ---
db_user = 'root'
db_pass_raw = 'srihari@05'
db_pass = quote_plus(db_pass_raw)
db_host = 'localhost'
db_name = 'restaurant_db'

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{db_user}:{db_pass}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Model Definitions ---
reservation_tables = db.Table('reservation_tables',
    db.Column('reservation_id', db.Integer, db.ForeignKey('reservations.id'), primary_key=True),
    db.Column('table_id', db.Integer, db.ForeignKey('dining_tables.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    reservations = db.relationship('Reservation', backref='user', lazy=True) # Link to reservations
    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)

class Reservation(db.Model):
    __tablename__ = 'reservations'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    contact_info = db.Column(db.String(100), nullable=False)
    reservation_date = db.Column(db.Date, nullable=False)
    reservation_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='Pending')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id')) # New user_id field
    tables = db.relationship('DiningTable', secondary=reservation_tables, backref='reservations')
    def to_dict(self):
        return {
            'id': self.id, 'customer_name': self.customer_name, 'contact_info': self.contact_info,
            'reservation_date': self.reservation_date.strftime('%Y-%m-%d'),
            'reservation_time': self.reservation_time.strftime('%H:%M'),
            'status': self.status, 'booked_tables': [table.to_dict() for table in self.tables]
        }

class DiningTable(db.Model):
    __tablename__ = 'dining_tables'
    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.String(10), unique=True, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    def to_dict(self): return {'id': self.id, 'table_number': self.table_number, 'capacity': self.capacity}

# --- Authentication API Endpoints ---
@app.route('/api/register', methods=['POST'])
def register_client():
    data = request.get_json()
    username, password, email, phone = data.get('username'), data.get('password'), data.get('email'), data.get('phone')
    if not all([username, password, email, phone]): return jsonify({'error': 'All fields are required'}), 400
    if User.query.filter_by(username=username).first(): return jsonify({'error': 'Username already exists'}), 409
    if User.query.filter_by(email=email).first(): return jsonify({'error': 'Email address already registered'}), 409
    new_user = User(username=username, email=email, phone_number=phone)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login/client', methods=['POST'])
def login_client():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        return jsonify({'message': 'Client login successful', 'user': {'id': user.id, 'username': user.username}}), 200
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/login/admin', methods=['POST'])
def login_admin():
    data = request.get_json()
    if data.get('username') == 'admin' and data.get('password') == 'admin123': return jsonify({'message': 'Admin login successful'}), 200
    return jsonify({'error': 'Invalid admin credentials'}), 401

# --- Reservation & Table API Endpoints ---
@app.route('/api/tables', methods=['GET'])
def get_table_status():
    booking_date_str, booking_time_str = request.args.get('date'), request.args.get('time')
    if not booking_date_str or not booking_time_str: return jsonify({"error": "Date and time query parameters are required"}), 400
    try:
        booking_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date()
        subquery = db.session.query(reservation_tables.c.table_id).join(Reservation).filter(Reservation.reservation_date == booking_date, Reservation.reservation_time == booking_time_str, Reservation.status.in_(['Pending', 'Accepted'])).subquery()
        booked_ids = {item[0] for item in db.session.query(subquery.c.table_id).all()}
        all_tables = DiningTable.query.all()
        return jsonify([{'id': table.id, 'table_number': table.table_number, 'capacity': table.capacity, 'is_booked': table.id in booked_ids} for table in all_tables])
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.get_json()
    required_fields = ['name', 'contact', 'date', 'time', 'table_ids', 'userId']
    if not all(field in data for field in required_fields) or not data['table_ids']: return jsonify({'error': 'Missing required fields'}), 400
    
    # --- FIX: Ensure table IDs are unique to prevent duplicate entries ---
    unique_table_ids = list(set(data['table_ids']))

    try:
        booking_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        booking_time = datetime.strptime(data['time'], '%H:%M').time()
        new_reservation = Reservation(customer_name=data['name'], contact_info=data['contact'], reservation_date=booking_date, reservation_time=booking_time, user_id=data['userId'])
        db.session.add(new_reservation)
        db.session.flush()
        
        # Loop over the unique list of table IDs
        for table_id in unique_table_ids:
            db.session.execute(reservation_tables.insert().values(reservation_id=new_reservation.id, table_id=table_id))
        
        db.session.commit()
        return jsonify({'message': 'Reservation successful!', 'id': new_reservation.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# --- Customer Bookings Endpoints ---
@app.route('/api/my-reservations/<int:user_id>', methods=['GET'])
def get_my_reservations(user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify({'error': 'User not found'}), 404
    reservations = Reservation.query.filter_by(user_id=user_id).order_by(Reservation.reservation_date.desc()).all()
    return jsonify([res.to_dict() for res in reservations])

@app.route('/api/reservations/<int:id>/cancel', methods=['PUT'])
def cancel_reservation(id):
    reservation = db.session.get(Reservation, id)
    if not reservation: return jsonify({'error': 'Reservation not found'}), 404
    reservation.status = 'Cancelled'
    db.session.commit()
    return jsonify({'message': 'Reservation cancelled successfully'})

# --- Admin Endpoints ---
@app.route('/api/reservations', methods=['GET'])
def get_all_reservations():
    reservations = Reservation.query.order_by(Reservation.reservation_date.desc(), Reservation.reservation_time.desc()).all()
    return jsonify([res.to_dict() for res in reservations])

@app.route('/api/reservations/<int:id>/status', methods=['PUT'])
def update_reservation_status(id):
    data = request.get_json()
    new_status = data.get('status')
    if not new_status or new_status not in ['Accepted', 'Rejected']: return jsonify({'error': 'Invalid status provided'}), 400
    reservation = db.session.get(Reservation, id)
    if not reservation: return jsonify({'error': 'Reservation not found'}), 404
    reservation.status = new_status
    db.session.commit()
    return jsonify({'message': f'Reservation #{id} status updated to {new_status}'})

@app.route('/api/reservations/<int:id>', methods=['DELETE'])
def delete_reservation(id):
    reservation = db.session.get(Reservation, id)
    if not reservation: return jsonify({'error': 'Reservation not found.'}), 404
    db.session.delete(reservation)
    db.session.commit()
    return jsonify({'message': f'Reservation #{id} deleted successfully.'})

# --- Main Execution Block ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
