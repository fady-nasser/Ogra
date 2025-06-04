document.addEventListener("DOMContentLoaded", () => {
    // Store the last selected seat element
    let lastSelectedSeat = null;

    // Get all seat elements, the input field, and the button
    const seats = document.querySelectorAll('.card-seat');
    const input = document.querySelector('input[name="money"]');
    const button = document.querySelector('.button');

    // Variables to help detect double-tap on touch devices
    let lastTap = 0;
    let tapTimeout = null;

    // Loop through each seat to add event listeners
    seats.forEach(seat => {
        // Handle single click (or tap) to select a seat
        seat.addEventListener('click', function (e) {
            // Ignore if seat is disabled
            if (seat.classList.contains('disabled')) return;
            // Deselect all seats
            seats.forEach(s => s.classList.remove('selected'));
            // Select the clicked seat
            seat.classList.add('selected');
            // Remember this seat as the last selected
            lastSelectedSeat = seat;
        });

        // Handle double-click with mouse to toggle disabled state
        seat.addEventListener('dblclick', function () {
            toggleSeatDisabled(seat);
        });

        // Handle double-tap on touch devices to toggle disabled state
        seat.addEventListener('touchend', function (e) {
            const now = Date.now();
            // If two taps within 400ms, treat as double-tap
            if (now - lastTap < 400) {
                clearTimeout(tapTimeout); // Cancel pending single tap
                toggleSeatDisabled(seat); // Toggle disabled state
            } else {
                // Wait to see if a second tap comes in 400ms
                tapTimeout = setTimeout(() => {
                    // Single tap does nothing special here
                }, 400);
            }
            lastTap = now; // Update last tap time
        });
    });

    /**
     1- Toggles the disabled state of a seat.
     2- If disabled, removes the class and clears content.
     3- If enabled, adds the class, removes selection, and clears content.
     */
    function toggleSeatDisabled(seat) {
        if (seat.classList.contains('disabled')) {
            // If already disabled, enable it and clear content
            seat.classList.remove('disabled');
            seat.textContent = '';
        } else {
            // If enabled, disable it, remove selection, and clear content
            seat.classList.add('disabled');
            seat.classList.remove('selected');
            seat.textContent = '';
        }
    }

    // When the button is clicked, assign the input value to the last selected seat (if not disabled)
    button.addEventListener('click', function () {
        if (lastSelectedSeat && !lastSelectedSeat.classList.contains('disabled')) {
            lastSelectedSeat.textContent = input.value;
        }
    });
});