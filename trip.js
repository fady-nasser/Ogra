// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // --- DOM ELEMENTS ---
    let lastSelectedSeat = null;
    const seats = document.querySelectorAll('.card-seat:not(.driver)'); // All seat elements except driver
    const input = document.querySelector('input[name="fare"]'); // Fare input field
    const less_btns = document.querySelectorAll('.less'); // All "less" buttons
    const more_btns = document.querySelectorAll('.more'); // All "more" buttons
    const menu = document.querySelector('.menu'); // The seat menu/modal
    const backdrop = document.querySelector('.backdrop'); // The modal backdrop
    const close = document.querySelector('.close'); // The close button for the menu
    const amounts = document.querySelectorAll(".menu>div:not(.close) .number"); // All amount fields in the menu
    const add_btn = document.querySelector('.add'); // The add/confirm button in the menu

    // --- CONSTANTS ---
    const money_values = [0.25, 0.5, 1, 5, 10, 20, 50, 100, 200]; // Coin/note values

    // --- STATE ---
    let seat_change_needs = [];
    let total_money = [];
    let lastTap = 0;
    let tapTimeout = null;

    

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
            calculate(total_change);
        } else {
            input.classList.add('error');
            input.addEventListener('input', function () {
                input.classList.remove('error');
            });
        }
    }

    // --- GREEDY CHANGE DISTRIBUTION ---
    function calculate(total_change_array) {
        let coins_available = [...total_change_array]; // Copy of available coins
        let coins_to_give_per_seat = Array.from(seats).map(() => new Array(money_values.length).fill(0));
        let seat_needs = [...seat_change_needs]; // Copy to mutate

        // For each seat, try to fulfill as much of its need as possible
        seat_needs.forEach((need, seatIndex) => {
            let amount_needed = need;
            let coins_to_give = new Array(money_values.length).fill(0);

            for (let i = money_values.length - 1; i >= 0; i--) {
                // Give as much as possible, but never more than needed or available
                let max_coins = Math.floor(amount_needed / money_values[i]);
                let coins = Math.min(max_coins, coins_available[i]);
                if (coins > 0) {
                    coins_to_give[i] = coins;
                    amount_needed -= coins * money_values[i];
                    amount_needed = Math.round(amount_needed * 100) / 100; // Fix precision
                    coins_available[i] -= coins;
                }
            }

            coins_to_give_per_seat[seatIndex] = coins_to_give;
            seat_needs[seatIndex] = amount_needed; // Update remaining need for this seat
        });

        // If there is still need left, try to redistribute coins from other seats
        let needs_remaining = seat_needs.some(need => need > 0.001);
        if (needs_remaining) {
            for (let seatIndex = 0; seatIndex < seat_needs.length; seatIndex++) {
                let amount_needed = seat_needs[seatIndex];
                if (amount_needed < 0.01) continue;
                for (let i = money_values.length - 1; i >= 0; i--) {
                    if (coins_available[i] > 0 && amount_needed >= money_values[i]) {
                        let max_coins = Math.floor(amount_needed / money_values[i]);
                        let coins = Math.min(max_coins, coins_available[i]);
                        if (coins > 0) {
                            coins_to_give_per_seat[seatIndex][i] += coins;
                            amount_needed -= coins * money_values[i];
                            amount_needed = Math.round(amount_needed * 100) / 100;
                            coins_available[i] -= coins;
                            seat_needs[seatIndex] = amount_needed;
                            if (amount_needed < 0.01) break;
                        }
                    }
                }
            }
        }

        // Log results for debugging
        console.log("Coins to give per seat:", coins_to_give_per_seat);
        console.log("Unmet needs per seat:", seat_needs);
        console.log("Remaining coins available:", coins_available);

        // Show remaining money in the UI
        input.nextElementSibling.textContent = change_to_money(coins_available);
    }

    // --- MENU/BACKDROP EVENTS ---
    [backdrop, close, add_btn].forEach(e => {
        e.addEventListener('click', function () {
            hide_menu();
        });
    });

    // --- SEAT EVENTS ---
    seats.forEach(seat => {
        seat.addEventListener('click', function (e) {
            if (seat.classList.contains('disabled')) return;
            seats.forEach(s => s.classList.remove('selected'));
            seat.classList.add('selected');
            lastSelectedSeat = seat;
            menu.classList.add('show');
            backdrop.classList.add('show');
            update(seat);
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
});