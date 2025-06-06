// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // Keep track of the last selected seat
    let lastSelectedSeat = null;

    // Query all relevant DOM elements
    const seats = document.querySelectorAll('.card-seat:not(.driver)'); // All seat elements
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

    seat_change_needs = [];

    money_values = [0.25, 0.5, 1, 5, 10, 20, 50, 100,200]; //  money values
    total_money = [];

    function hide_menu(){
        // Hide the menu and backdrop
        menu.classList.remove('show');
        backdrop.classList.remove('show');
    }

    function change_to_money(money_array)
    {
        return money_array.reduce((sum, count, index) => {
                return sum + count * money_values[index];
            }, 0);

    }
    function update(seat) {

            // Parse the seat's money data and update the menu amounts
            let money_array = seat.dataset.money.split(',').map(Number);
            amounts.forEach((amount, index) => {
                amount.textContent = money_array[index];
            });
            money_arrays = Array.from(seats).map(s => s.dataset.money.split(',').map(Number));
            total_change = new Array(money_arrays[0].length).fill(0);
            seat_payed = change_to_money(money_array);
            money_arrays.forEach(array => {
                array.forEach((value, index) => {
                    total_change[index] += value;
                    
                });
            });
            console.log("Total change: " + total_change);

            seat.textContent = seat_payed; // Update the seat's text with the total money value
            seat_change_needs = new Array(seats.length).fill(0);
            if (input.value != "") {
                fare = parseFloat(input.value);
                seats.forEach((s, i) => {
                change_needed = -1.0 *( fare - (parseFloat(s.innerText) || 0));
                seat_change_needs[i] = change_needed < 0 ? 0 : change_needed;
                // input.nextElementSibling.textContent = total_change;
                calculate(total_change);

            });
            console.log("Seat change needs: " + seat_change_needs);
            }
            else
            {
                input.classList.add('error');
                input.addEventListener('input', function () {
                    input.classList.remove('error');
                });
            }
            // input.nextElementSibling.textContent = total_change;
            calculate(total_change);
            

            // calculate();
    }
    // function calculate(total_change) {
    //     // Calculate the total money from all seats
    //     total_money = Array.from(seats).reduce((total, seat) => {
    //         if (!seat.classList.contains('disabled')) {
    //             let money_array = seat.dataset.money.split(',').map(Number);
    //             return total + change_to_money(money_array);
    //         }
    //         return total;
    //     }, 0);
    //     // console.log("na");
    //     console.log("Total money: " + total_money);
    //     all_coins_to_give = new Array(seats.length).fill([]);
        
    //     seats.forEach((seat, index) =>{
    //         // console.log("nani");
    //         coins_to_give = new Array(total_change[0].length).fill(0);
    //         for (let i = money_values.length - 1; i >= 0; i--) {
    //             // console.log("n");
    //              console.log("Total change: " + total_change[i]);


    //         while (total_change[i] > 0 && seat_change_needs >= money_values[i]) {
    //             coins_to_give[i]++;
    //             total_money -= money_values[i];
    //             seat_change_needs[index] -= money_values[i];
    //             total_change[i]--;
    //             console.log(coins_to_give[i] + " coins of " + money_values[i] + " added to seat " + i);
    //             all_coins_to_give[index][i] = coins_to_give[i];
    //         }
            
    //     }
    //     });
        

    // }
        
    // Hide the menu and backdrop when the backdrop is clicked
    
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
        // (e.g., if seat 2 has a coin, give it to seat 1 if seat 1 still needs change)
        let needs_remaining = seat_needs.some(need => need > 0.001);
        if (needs_remaining) {
            // Try to use any remaining coins to reduce needs, without exceeding the need
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

        console.log("Coins to give per seat:", coins_to_give_per_seat);
        console.log("Unmet needs per seat:", seat_needs);
        console.log("Remaining coins available:", coins_available);
        
        total_change_array = coins_available; 
        console.log("money remaining: ", total_change_array);
        input.nextElementSibling.textContent = change_to_money(total_change_array);

    }

    
    [backdrop, close, add_btn].forEach(e =>
    {
        e.addEventListener('click', function () {
            hide_menu();
    }) });
    // addEventListener('click', function () {
    //     show_menu();
    // });

    // // Hide the menu and backdrop when the close button is clicked
    // close.addEventListener('click', function () {
    //     show_menu();
    // });

    // // Hide the menu and backdrop when the add button is clicked
    // add_btn.addEventListener('click', function () {
    //     show_menu();
    // });

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
            update(seat);
        });

        // // Handle double-click with mouse to toggle disabled state
        // seat.addEventListener('dblclick', function () {
        //     toggleSeatDisabled(seat);
        // });

        // Handle double-tap on touch devices to toggle disabled state
        // seat.addEventListener('touchend', function (e) {
        //     const now = Date.now();
        //     // If two taps within 400ms, treat as double-tap
        //     if (now - lastTap < 400) {
        //         clearTimeout(tapTimeout); // Cancel pending single tap
        //         toggleSeatDisabled(seat); // Toggle disabled state
        //     } else {
        //         // Wait to see if a second tap comes in 400ms
        //         tapTimeout = setTimeout(() => {
        //             // Single tap does nothing special here
        //         }, 400);
        //     }
        //     lastTap = now; // Update last tap time
        // });
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
                update(lastSelectedSeat); // Update the seat display
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
            update(lastSelectedSeat); // Update the seat display
        });
    });

});