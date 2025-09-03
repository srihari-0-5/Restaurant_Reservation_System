document.addEventListener('DOMContentLoaded', () => {
    // --- Get Logged In User ---
    const currentUser = JSON.parse(localStorage.getItem('restaurantUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('welcome-username').textContent = currentUser.username;

    // --- Element Selectors ---
    const form = document.getElementById('reservation-form');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const seatMap = document.getElementById('seat-map');
    const seatMapPrompt = document.getElementById('seat-map-prompt');
    const errorDisplay = document.getElementById('form-error');
    
    // --- My Bookings Modal Elements ---
    const bookingsModal = document.getElementById('my-bookings-modal');
    const openBookingsBtn = document.getElementById('my-bookings-btn');
    const closeBookingsBtn = document.getElementById('close-bookings-modal-btn');
    const bookingsList = document.getElementById('bookings-list');

    // --- State ---
    let selectedTables = [];

    // --- 4x4 Grid Layout ---
    const layout = [
        'A1', 'A2', 'A3', 'A4',
        'B1', 'B2', 'B3', 'B4',
        'C1', 'C2', 'C3', 'C4',
        'D1', 'D2', 'D3', 'D4'
    ];

    // --- Cleaner SVG Icons ---
    const svgIcons = {
        '2': `<svg class="table-icon" viewBox="0 0 100 100"><rect x="30" y="25" width="40" height="50" rx="5"/><circle cx="50" cy="10" r="8"/><circle cx="50" cy="90" r="8"/></svg>`,
        '4': `<svg class="table-icon" viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" rx="5"/><circle cx="10" cy="50" r="8"/><circle cx="90" cy="50" r="8"/><circle cx="50" cy="10" r="8"/><circle cx="50" cy="90" r="8"/></svg>`,
        '6': `<svg class="table-icon" viewBox="0 0 100 100"><rect x="20" y="25" width="60" height="50" rx="5"/><circle cx="10" cy="50" r="8"/><circle cx="90" cy="50" r="8"/><circle cx="35" cy="10" r="8"/><circle cx="65" cy="10" r="8"/><circle cx="35" cy="90" r="8"/><circle cx="65" cy="90" r="8"/></svg>`
    };

    /**
     * Fetches table status and renders the floor plan.
     */
    async function renderTables() {
        const date = dateInput.value;
        const time = timeInput.value;
        
        if (!date || !time) {
            seatMap.innerHTML = '';
            seatMapPrompt.textContent = 'Please select a date and time to see available tables.';
            return;
        }

        seatMapPrompt.textContent = 'Loading tables...';
        seatMap.innerHTML = '';

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/tables?date=${date}&time=${time}`);
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const tablesData = await response.json();
            seatMapPrompt.textContent = 'Please select one or more tables.';

            const tablesMap = new Map(tablesData.map(t => [t.table_number, t]));

            layout.forEach((item, index) => {
                const gridItem = document.createElement('div');
                gridItem.classList.add('grid-item');
                gridItem.style.setProperty('--i', index); // For staggered animation

                if (item && tablesMap.has(item)) {
                    const table = tablesMap.get(item);
                    const tableEl = document.createElement('div');
                    tableEl.classList.add('table');
                    tableEl.dataset.id = table.id;

                    const iconSvg = svgIcons[table.capacity] || svgIcons['4'];
                    tableEl.innerHTML = `
                        ${iconSvg}
                        <span class="table-number">${table.table_number}</span>
                    `;

                    if (table.is_booked) {
                        tableEl.classList.add('booked');
                    } else {
                        tableEl.classList.add('available');
                    }
                    gridItem.appendChild(tableEl);
                }
                seatMap.appendChild(gridItem);
            });

        } catch (error) {
            console.error('Error rendering tables:', error);
            seatMapPrompt.textContent = 'Could not load tables. Please try again.';
        }
    }

    /**
     * Fetches and displays the current user's bookings in the modal.
     */
    async function showMyBookings() {
        bookingsList.innerHTML = '<p>Loading your bookings...</p>';
        bookingsModal.classList.add('active');
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/my-reservations/${currentUser.id}`);
            const bookings = await response.json();
            
            bookingsList.innerHTML = '';
            if (bookings.length === 0) {
                bookingsList.innerHTML = '<p>You have no past or upcoming reservations.</p>';
                return;
            }

            bookings.forEach(booking => {
                const bookingCard = document.createElement('div');
                bookingCard.className = 'booking-card';
                const tables = booking.booked_tables.map(t => t.table_number).join(', ');
                
                const bookingDate = new Date(booking.reservation_date + 'T00:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const canCancel = bookingDate >= today && (booking.status === 'Pending' || booking.status === 'Accepted');
                const cancelButtonHtml = canCancel ? `<button class="cancel-btn" data-id="${booking.id}">Cancel</button>` : '';

                bookingCard.innerHTML = `
                    <div class="booking-details">
                        <p><strong>Date:</strong> ${booking.reservation_date} at ${booking.reservation_time}</p>
                        <p><strong>Tables:</strong> ${tables}</p>
                    </div>
                    <div class="booking-status">
                        <span class="status ${booking.status.toLowerCase()}">${booking.status}</span>
                        ${cancelButtonHtml}
                    </div>
                `;
                bookingsList.appendChild(bookingCard);
            });
        } catch (error) {
            bookingsList.innerHTML = '<p>Could not load your bookings.</p>';
        }
    }

    // --- Initial Setup ---
    function initializePage() {
        const now = new Date();
        dateInput.value = now.toISOString().split('T')[0];
        dateInput.min = dateInput.value;
        timeInput.value = now.toTimeString().slice(0,5);
        renderTables();
    }

    // --- Event Listeners ---
    dateInput.addEventListener('change', renderTables);
    timeInput.addEventListener('change', renderTables);
    openBookingsBtn.addEventListener('click', showMyBookings);
    closeBookingsBtn.addEventListener('click', () => bookingsModal.classList.remove('active'));
    bookingsModal.addEventListener('click', (e) => { if (e.target === bookingsModal) bookingsModal.classList.remove('active'); });

    seatMap.addEventListener('click', (event) => {
        const tableEl = event.target.closest('.table.available');
        if (!tableEl) return;

        tableEl.classList.toggle('selected');
        const tableId = parseInt(tableEl.dataset.id);
        if (tableEl.classList.contains('selected')) {
            selectedTables.push(tableId);
        } else {
            selectedTables = selectedTables.filter(id => id !== tableId);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorDisplay.textContent = '';

        if (selectedTables.length === 0) {
            errorDisplay.textContent = 'Please select at least one table.';
            return;
        }

        const formData = {
            name: form.name.value,
            contact: form.contact.value,
            date: form.date.value,
            time: form.time.value,
            table_ids: selectedTables,
            userId: currentUser.id // Add the logged-in user's ID
        };

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');

            alert(`Reservation Confirmed! Your Booking ID is #${result.id}`);
            window.location.reload();
        } catch (error) {
            console.error('Submission failed:', error);
            errorDisplay.textContent = `Error: ${error.message}`;
        }
    });

    bookingsList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('cancel-btn')) {
            const bookingId = event.target.dataset.id;
            if (confirm('Are you sure you want to cancel this reservation?')) {
                try {
                    const response = await fetch(`http://127.0.0.1:5000/api/reservations/${bookingId}/cancel`, { method: 'PUT' });
                    if (!response.ok) throw new Error('Failed to cancel.');
                    showMyBookings();
                } catch (error) {
                    alert('Error cancelling reservation.');
                }
            }
        }
    });

    initializePage();
});
