document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('reservations-tbody');
    
    const allBookingsCount = document.getElementById('all-bookings-count');
    const newBookingsCount = document.getElementById('new-bookings-count');
    const acceptedBookingsCount = document.getElementById('accepted-bookings-count');
    const rejectedBookingsCount = document.getElementById('rejected-bookings-count');

    const loadReservations = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/reservations');
            if (!response.ok) throw new Error('Failed to fetch reservations.');
            
            const reservations = await response.json();
            
            allBookingsCount.textContent = reservations.length;
            newBookingsCount.textContent = reservations.filter(r => r.status === 'Pending').length;
            acceptedBookingsCount.textContent = reservations.filter(r => r.status === 'Accepted').length;
            rejectedBookingsCount.textContent = reservations.filter(r => r.status === 'Rejected').length;

            tableBody.innerHTML = '';
            if (reservations.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No reservations found.</td></tr>';
                return;
            }

            reservations.forEach(res => {
                const row = document.createElement('tr');
                const tablesList = res.booked_tables.map(t => t.table_number).join(', ');
                
                const actionsHtml = res.status === 'Pending' 
                    ? `<button class="action-btn accept" data-id="${res.id}">Accept</button>
                       <button class="action-btn reject" data-id="${res.id}">Reject</button>`
                    : `<button class="action-btn delete" data-id="${res.id}">Delete</button>`;

                row.innerHTML = `
                    <td>${res.customer_name}</td>
                    <td>${res.contact_info}</td>
                    <td>${res.reservation_date} at ${res.reservation_time}</td>
                    <td>${tablesList}</td>
                    <td><span class="status ${res.status.toLowerCase()}">${res.status}</span></td>
                    <td class="actions">${actionsHtml}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Error loading reservations:', error);
            tableBody.innerHTML = '<tr><td colspan="6">Error loading data.</td></tr>';
        }
    };

    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = target.dataset.id;
        if (!id) return;

        let url = `http://127.0.0.1:5000/api/reservations/${id}`;
        let method = 'DELETE';
        let body = null;
        let confirmationMessage = `Are you sure you want to delete reservation #${id}?`;

        if (target.classList.contains('accept') || target.classList.contains('reject')) {
            url = `http://127.0.0.1:5000/api/reservations/${id}/status`;
            method = 'PUT';
            body = JSON.stringify({ status: target.classList.contains('accept') ? 'Accepted' : 'Rejected' });
            confirmationMessage = `Are you sure you want to ${target.textContent.toLowerCase()} this booking?`;
        }
        
        if (confirm(confirmationMessage)) {
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });
                if (response.ok) {
                    loadReservations();
                } else {
                    const result = await response.json();
                    alert(`Error: ${result.error}`);
                }
            } catch (error) {
                alert('Could not connect to the server.');
            }
        }
    });

    loadReservations();
});
