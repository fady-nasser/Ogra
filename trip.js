// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // --- DOM ELEMENTS ---
    let lastSelectedSeat = null;
    const seats = document.querySelectorAll('.card-seat:not(.driver)');
    const input = document.querySelector('input[name="fare"]');
    const less_btns = document.querySelectorAll('.less');
    const more_btns = document.querySelectorAll('.more');
    const menu = document.querySelector('.menu');
    const backdrop = document.querySelector('.backdrop');
    const close = document.querySelector('.close');
    const amounts = document.querySelectorAll(".menu>div:not(.close) .number");
    const add_btn = document.querySelector('.add');

    // --- CONSTANTS ---
    const money_values = [0.25, 0.5, 1, 5, 10, 20, 50, 100, 200];

    // --- STATE ---
    let seat_change_needs = [];
    let suggestedSeats = new Set();
    let tapTimeout = null;
    let coins_to_give_per_seat = [];

    // --- UTILITY FUNCTIONS ---

    // Hide the menu and backdrop
    function hide_menu() {
        menu.classList.remove('show');
        backdrop.classList.remove('show');
    }

    // Calculate the total money value from a money array
    function change_to_money(money_array) {
        return money_array.reduce((sum, count, index) => sum + count * money_values[index], 0);
    }

    // Get the total available change from all seats
    function get_total_available_change() {
        let money_arrays = Array.from(seats).map(s => s.dataset.money.split(',').map(Number));
        let total = new Array(money_values.length).fill(0);
        money_arrays.forEach(array => {
            array.forEach((val, i) => total[i] += val);
        });
        return total;
    }

    // --- CONFIRM SUGGESTION FUNCTION ---
    function confirmSuggestion(index) {
        let seat = seats[index];
        seat.classList.remove('suggested');
        seat.classList.add('confirmed');
        seat_change_needs[index] = 0;

        // Subtract the given coins from the seat's dataset.money
        let current_money = seat.dataset.money.split(',').map(Number);
        let given = coins_to_give_per_seat[index];
        let new_money = current_money.map((val, i) => val - given[i]);
        seat.dataset.money = new_money.join(',');

        // Update the seat's display
        seat.textContent = change_to_money(new_money);

        // Recalculate with updated data
        calculate(get_total_available_change());
    }

    // --- MAIN UPDATE FUNCTION ---
    function update(seat) {
        // Parse the seat's money data and update the menu amounts
        let money_array = seat.dataset.money.split(',').map(Number);
        amounts.forEach((amount, index) => {
            amount.textContent = money_array[index];
        });

        // Gather all seats' money arrays
        let money_arrays = Array.from(seats).map(s => s.dataset.money.split(',').map(Number));
        let total_change = new Array(money_arrays[0].length).fill(0);

        // Calculate total coins/notes available for change
        money_arrays.forEach(array => {
            array.forEach((value, index) => {
                total_change[index] += value;
            });
        });
        console.log("Total change: " + total_change);

        // Update seat display with total paid
        let seat_payed = change_to_money(money_array);
        seat.textContent = seat_payed;

        // Calculate how much change each seat needs
        seat_change_needs = new Array(seats.length).fill(0);
        if (input.value !== "") {
            let fare = parseFloat(input.value);
            seats.forEach((s, i) => {
                let paid = parseFloat(s.innerText) || 0;
                let change_needed = paid - fare;
                seat_change_needs[i] = change_needed < 0 ? 0 : change_needed;
            });
            console.log("Seat change needs: " + seat_change_needs);
            calculate(total_change); // Run greedy calculation
        } else {
            input.classList.add('error');
            input.addEventListener('input', function () {
                input.classList.remove('error');
            });
        }
    }

    // --- GREEDY CHANGE DISTRIBUTION ---
    function calculate(total_change_array) {
        let coins_available = [...total_change_array];
        let seat_needs = [...seat_change_needs];
        suggestedSeats.clear();

        seats.forEach((seat, seatIndex) => {
            let amount_needed = seat_needs[seatIndex];
            let coins_to_give = new Array(money_values.length).fill(0);
            let temp_coins_available = [...coins_available];
            let temp_amount = amount_needed;

            // Try to give the largest denominations first
            for (let i = money_values.length - 1; i >= 0; i--) {
                let max_coins = Math.floor(temp_amount / money_values[i]);
                let coins = Math.min(max_coins, temp_coins_available[i]);
                if (coins > 0) {
                    coins_to_give[i] = coins;
                    temp_amount -= coins * money_values[i];
                    temp_coins_available[i] -= coins;
                    console.log(temp_amount + " aaaaaaaaaaaa " + Math.round(temp_amount * 100) / 100);
                }
            }

            // If full change can be given, mark as confirmed
            if (temp_amount + 1 < 0.01) {
                coins_to_give.forEach((val, i) => coins_available[i] -= val);
                coins_to_give_per_seat[seatIndex] = coins_to_give;
                seat.classList.remove('suggested');
                seat.classList.add('confirmed');
            } else if (change_to_money(coins_to_give) > 0) {
                // Partial change is possible — suggest
                suggestedSeats.add(seatIndex);
                seat.classList.add('suggested');
                seat.classList.remove('confirmed');
                seat.childNodes[1]?.remove(); // Remove previous give div if exists

                let give_div = document.createElement('div');
                give_div.innerText = "Give: " + change_to_money(coins_to_give);
                seat.appendChild(give_div);
            } else {
                // No change possible
                seat.classList.remove('suggested');
                seat.classList.remove('confirmed');
            }
            coins_to_give_per_seat[seatIndex] = coins_to_give;
        });

        // Log suggestions for debugging
        console.log("Suggestions:", [...suggestedSeats]);
        // Show remaining money in the UI (optional)
        input.nextElementSibling.textContent = change_to_money(coins_available);
    }

    // --- MENU/BACKDROP EVENTS ---
    [backdrop, close, add_btn].forEach(e => {
        e.addEventListener('click', function () {
            hide_menu();
        });
    });

    // --- SEAT EVENTS ---
    seats.forEach((seat, i) => {
        // Long press to confirm suggestion (mouse)
        seat.addEventListener('mousedown', function () {
            if (!suggestedSeats.has(i)) return;
            tapTimeout = setTimeout(() => {
                confirmSuggestion(i);
            }, 600);
        });
        seat.addEventListener('mouseup', () => {
            clearTimeout(tapTimeout);
        });
        seat.addEventListener('mouseleave', () => {
            clearTimeout(tapTimeout);
        });

        // Long press to confirm suggestion (touch)
        seat.addEventListener('touchstart', function () {
            if (!suggestedSeats.has(i)) return;
            tapTimeout = setTimeout(() => {
                confirmSuggestion(i);
            }, 600);
        });
        seat.addEventListener('touchend', () => {
            clearTimeout(tapTimeout);
        });
        seat.addEventListener('touchcancel', () => {
            clearTimeout(tapTimeout);
        });

        // Open menu on click
        seat.addEventListener('click', function () {
            if (seat.classList.contains('disabled')) return;
            seats.forEach(s => s.classList.remove('selected'));
            seat.classList.add('selected');
            lastSelectedSeat = seat;
            menu.classList.add('show');
            backdrop.classList.add('show');
            update(seat);
        });
    });

    // --- AMOUNT BUTTON EVENTS ---
    less_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            let amount = btn.previousElementSibling;
            if (parseInt(amount.textContent) > 0) {
                amount.textContent = parseInt(amount.textContent) - 1;
                let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
                lastSelectedSeat.dataset.money = money_array.join(',');
                update(lastSelectedSeat);
            }
        });
    });

    more_btns.forEach(btn => {
        btn.addEventListener('click', function () {
            let amount = btn.nextElementSibling;
            amount.textContent = parseInt(amount.textContent) + 1;
            let money_array = Array.from(amounts).map(a => parseInt(a.textContent));
            lastSelectedSeat.dataset.money = money_array.join(',');
            update(lastSelectedSeat);
        });
    });

    // --- TOGGLE DISABLED STATE (OPTIONAL) ---
    function toggleSeatDisabled(seat) {
        if (seat.classList.contains('disabled')) {
            seat.classList.remove('disabled');
            seat.textContent = '';
        } else {
            seat.classList.add('disabled');
            seat.classList.remove('selected');
            seat.textContent = '';
        }
    }
});