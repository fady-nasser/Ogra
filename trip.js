// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // Keep track of the last selected seat
    let lastSelectedSeat = null;

    // Query all relevant DOM elements
    const seats = document.querySelectorAll('.card-seat'); // All seat elements
    const input = document.querySelector('input[name="fare"]'); // Fare input field (if used)
    const less_btns = document.querySelectorAll('.less'); // All "less" buttons
    const more_btns = document.querySelectorAll('.more'); // All "more" buttons
    const menu = document.querySelector('.menu'); // The seat menu/modal
    const backdrop = document.querySelector('.backdrop'); // The modal backdrop
    const close = document.querySelector('.close'); // The close button for the menu
    const amounts = document.querySelectorAll(".menu>div:not(.close) .number"); // All amount fields in the menu
    const add_btn = document.querySelector('.add'); // The add/confirm button in the menu

    // Variables for double-tap detection on touch devices
    let lastTap = 0;
    let tapTimeout = null;

    // Hide the menu and backdrop when the backdrop is clicked
    backdrop.addEventListener('click', function () {
        menu.classList.remove('show');
        backdrop.classList.remove('show');
    });

    // Hide the menu and backdrop when the close button is clicked
    close.addEventListener('click', function () {
        menu.classList.remove('show');
        backdrop.classList.remove('show');
    });

    // Hide the menu and backdrop when the add button is clicked
    add_btn.addEventListener('click', function () {
        menu.classList.remove('show');
        backdrop.classList.remove('show');
    });

    // Add event listeners to each seat
    seats.forEach(seat => {
        // When a seat is clicked (or tapped), select it and show the menu
        seat.addEventListener('click', function (e) {
            // Ignore clicks on disabled seats
            if (seat.classList.contains('disabled')) return;
            // Deselect all seats
            seats.forEach(s => s.classList.remove('selected'));
            // Select this seat
            seat.classList.add('selected');
            // Remember this seat as the last selected
            lastSelectedSeat = seat;
            // Show the menu and backdrop
            menu.classList.add('show');
            backdrop.classList.add('show');
            // Parse the seat's money data and update the menu amounts
            let money_array = seat.dataset.money.split(',').map(Number);
            amounts.forEach((amount, index) => {
                amount.textContent = money_array[index];
            });
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
     * Toggle the disabled state of a seat.
     * If the seat is disabled, enable it and clear its content.
     * If the seat is enabled, disable it, remove selection, and clear its content.
     */
    function toggleSeatDisabled(seat) {
        if (seat.classList.contains('disabled')) {
            seat.classList.remove('disabled'); // Enable the seat
            seat.textContent = ''; // Clear any content
        } else {
            seat.classList.add('disabled'); // Disable the seat
            seat.classList.remove('selected'); // Remove selection
            seat.textContent = ''; // Clear any content
        }
    }

    // Add event listeners to all "less" buttons to decrease the amount
    less_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            // The amount element is the previous sibling of the button
            let amount = btn.previousElementSibling;
            // Only decrease if the amount is greater than 0
            if (parseInt(amount.textContent) > 0) {
                amount.textContent = parseInt(amount.textContent) - 1;
                // Update the money_array and the seat's data-money attribute
                let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
                lastSelectedSeat.dataset.money = money_array.join(',');
            }
        });
    });

    // Add event listeners to all "more" buttons to increase the amount
    more_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            // The amount element is the next sibling of the button
            let amount = btn.nextElementSibling;
            amount.textContent = parseInt(amount.textContent) + 1;
            // Update the money_array and the seat's data-money attribute
            let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
            lastSelectedSeat.dataset.money = money_array.join(',');
        });
    });

});