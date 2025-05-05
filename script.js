const deckElement = document.getElementById('deck');
const playerArea = document.getElementById('player-cards');
const boardArea = document.getElementById('board-cards');
const oddsElement = document.getElementById('odds');
const descriptionElement = document.getElementById('hand-description').querySelector('p');
const trendsElement = document.getElementById('trend-list');

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

let selected = { player: [], board: [] };

function createDeck() {
    deckElement.innerHTML = '';

    suits.forEach(suit => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'deck-row';

        values.forEach(value => {
            const card = value + suit;
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.innerHTML = formatCardHTML(card);
            cardDiv.dataset.card = card;

            if (suit === '♥' || suit === '♦') {
                cardDiv.classList.add('red-suit');
            } else {
                cardDiv.classList.add('black-suit');
            }

            cardDiv.addEventListener('click', () => selectCard(cardDiv));
            rowDiv.appendChild(cardDiv);
        });

        deckElement.appendChild(rowDiv);
    });
}




function selectCard(cardDiv) {
    const card = cardDiv.dataset.card;

    if (cardDiv.classList.contains('selected')) {
        cardDiv.classList.remove('selected');

        if (selected.player.includes(card)) {
            selected.player = selected.player.filter(c => c !== card);
            [...playerArea.children].forEach(el => {
                if (el.innerHTML.includes(cardToFilename(card))) el.remove();
            });
        } else if (selected.board.includes(card)) {
            selected.board = selected.board.filter(c => c !== card);
            [...boardArea.children].forEach(el => {
                if (el.innerHTML.includes(cardToFilename(card))) el.remove();
            });
        }

        updateSimulation();
        return;
    }

    if (selected.player.length < 2) {
        selected.player.push(card);
        const el = cloneCard(card);
        if (card[1] === '♥' || card[1] === '♦') el.classList.add('red-suit');
        else el.classList.add('black-suit');
        playerArea.appendChild(el);
    } else if (selected.board.length < 5) {
        selected.board.push(card);
        const el = cloneCard(card);
        if (card[1] === '♥' || card[1] === '♦') el.classList.add('red-suit');
        else el.classList.add('black-suit');
        boardArea.appendChild(el);
    } else {
        alert('Maksymalna liczba kart została osiągnięta.');
        return;
    }

    cardDiv.classList.add('selected');
    updateSimulation();
}

function cloneCard(card) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = formatCardHTML(card);
    return el;
}

function updateSimulation() {
    if (selected.player.length !== 2 || selected.board.length < 3) {
        descriptionElement.textContent = 'Wprowadź 2 karty gracza i co najmniej 3 na stole';
        trendsElement.innerHTML = '<li>Brak danych</li>';
        oddsElement.innerHTML = defaultOdds();
        return;
    }

    const result = monteCarloSimulation(10000);
    renderResults(result);
    const players = parseInt(document.getElementById('players').value);
    simulateVsOpponents(selected.player, selected.board, players);

}

function monteCarloSimulation(samples) {
    const deck = generateDeck().filter(card => !selected.player.includes(card) && !selected.board.includes(card));
    const hand = [...selected.player, ...selected.board];
    const trials = samples;
    const stats = {
        "Para": 0, "Dwie pary": 0, "Trójka": 0, "Strit": 0,
        "Kolor": 0, "Full": 0, "Kareta": 0, "Poker": 0
    };

    for (let i = 0; i < trials; i++) {
        const remaining = [...deck];
        shuffleArray(remaining);
        const additional = remaining.slice(0, 5 - selected.board.length);
        const fullHand = [...hand, ...additional];
        const handType = evaluateHand(fullHand);
        if (stats[handType] !== undefined) stats[handType]++;
    }

    Object.keys(stats).forEach(key => {
        stats[key] = (stats[key] / trials) * 100;
    });

    return stats;
}

function generateDeck() {
    return suits.flatMap(suit => values.map(value => value + suit));
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function evaluateHand(cards) {
    const combinations = getCombinations(cards, 5);
    let bestRank = 0;

    for (const combo of combinations) {
        const rank = rankHand(combo);
        if (rank > bestRank) bestRank = rank;
    }

    const names = [
        'Nic', 'Para', 'Dwie pary', 'Trójka',
        'Strit', 'Kolor', 'Full', 'Kareta', 'Poker'
    ];

    return names[bestRank];
}

function checkStraight(indices) {
    const unique = [...new Set(indices)].sort((a, b) => a - b);
    for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i + 4] - unique[i] === 4) return true;
    }
    if (unique.includes(12) && unique.includes(0) &&
        unique.includes(1) && unique.includes(2) &&
        unique.includes(3)) {
        return true;
    }
    return false;
}

function getCombinations(array, size) {
    if (size > array.length) return [];
    const results = [];

    function combine(start, combo) {
        if (combo.length === size) {
            results.push(combo);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combine(i + 1, [...combo, array[i]]);
        }
    }

    combine(0, []);
    return results;
}

function getBestHand(cards) {
    const combos = getCombinations(cards, 5);
    let best = combos[0];
    let bestRank = rankHand(best);
    for (let combo of combos) {
        const r = rankHand(combo);
        if (r > bestRank) {
            best = combo;
            bestRank = r;
        }
    }
    return best;
}


function rankHand(hand) {
    const vals = hand.map(c => c[0]);
    const suits = hand.map(c => c[1]);
    const valCounts = {};
    const suitCounts = {};

    vals.forEach(v => valCounts[v] = (valCounts[v] || 0) + 1);
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);

    const counts = Object.values(valCounts).sort((a, b) => b - a);
    const isFlush = Object.values(suitCounts).some(c => c >= 5);
    const isStraight = checkStraight(vals.map(v => '23456789TJQKA'.indexOf(v)));

    if (isFlush && isStraight) return 8; // Poker
    if (counts[0] === 4) return 7; // Kareta
    if (counts[0] === 3 && counts[1] === 2) return 6; // Full
    if (isFlush) return 5; // Kolor
    if (isStraight) return 4; // Strit
    if (counts[0] === 3) return 3; // Trójka
    if (counts[0] === 2 && counts[1] === 2) return 2; // Dwie pary
    if (counts[0] === 2) return 1; // Para
    return 0; // Nic
}


function renderResults(stats) {
    oddsElement.innerHTML = '';
    Object.entries(stats).forEach(([hand, val]) => {
        oddsElement.innerHTML += `<li>${hand}: ${val.toFixed(2)}%</li>`;
    });

    descriptionElement.textContent = 'Symulacja Monte Carlo na podstawie 10 000 rozgrywek.';
    trendsElement.innerHTML = '';
    if (stats['Strit'] > 15) trendsElement.innerHTML += '<li>Potencjał strita jest wysoki</li>';
    if (stats['Kolor'] > 15) trendsElement.innerHTML += '<li>Potencjał koloru jest wysoki</li>';
    if (stats['Full'] > 5) trendsElement.innerHTML += '<li>Możliwy Full House</li>';
}

function defaultOdds() {
    return `
    <li>Para: 0%</li>
    <li>Dwie pary: 0%</li>
    <li>Trójka: 0%</li>
    <li>Strit: 0%</li>
    <li>Kolor: 0%</li>
    <li>Full: 0%</li>
    <li>Kareta: 0%</li>
    <li>Poker: 0%</li>`;
}

function cardToFilename(card) {
    const valueMap = {
        '2': '2', '3': '3', '4': '4', '5': '5',
        '6': '6', '7': '7', '8': '8', '9': '9',
        'T': '10', 'J': 'jack', 'Q': 'queen',
        'K': 'king', 'A': 'ace'
    };
    const suitMap = {
        '♠': 'spades',
        '♥': 'hearts',
        '♦': 'diamonds',
        '♣': 'clubs'
    };
    const value = valueMap[card[0]];
    const suit = suitMap[card[1]];
    return `${value}_of_${suit}`;
}

function resetAll() {
    selected = { player: [], board: [] };
    playerArea.innerHTML = '';
    boardArea.innerHTML = '';
    descriptionElement.textContent = 'Brak wystarczających danych';
    trendsElement.innerHTML = '<li>Brak danych</li>';
    oddsElement.innerHTML = defaultOdds();
    document.getElementById('winrate-text').textContent = '---'; // 👈 reset tekstu o wygranej
    document.getElementById('strength-bar').style.width = '0%'; // 👈 reset paska siły
    createDeck();
}

createDeck();

function formatCardHTML(card) {
    const filename = cardToFilename(card);
    return `<img src="cards/${filename}.svg" class="card-img">`;
}


function simulateVsOpponents(myHand, board, playerCount = 2, samples = 5000) {
    const fullDeck = generateDeck().filter(c => !myHand.includes(c) && !board.includes(c));
    const myFullHand = [...myHand, ...board];

    let wins = 0, ties = 0, losses = 0;

    for (let i = 0; i < samples; i++) {
        let deck = [...fullDeck];
        shuffleArray(deck);

        const missingCommunity = 5 - board.length;
        const additionalBoard = deck.splice(0, missingCommunity);
        const fullBoard = [...board, ...additionalBoard];
        const myEval = rankHand(getBestHand([...myHand, ...fullBoard]));

        let beat = 0;
        for (let p = 1; p < playerCount; p++) {
            const opp = [deck.shift(), deck.shift()];
            const oppEval = rankHand(getBestHand([...opp, ...fullBoard]));
            if (oppEval > myEval) {
                beat++;
                break;
            }
        }

        if (beat === 0) wins++;
        else losses++;
    }

    const winrate = (wins / samples) * 100;
    document.getElementById('winrate-text').textContent =
        `Wygrywasz w ${winrate.toFixed(1)}% przypadków z ${playerCount - 1} przeciwnikami.`;

    document.getElementById('strength-bar').style.width = `${winrate.toFixed(1)}%`;
}

