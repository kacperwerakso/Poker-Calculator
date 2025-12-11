let deckElement, playerArea, boardArea, oddsElement, descriptionElement, trendsElement;
const suits = ['s', 'h', 'd', 'c'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
let selected = { player: [], board: [] };

document.addEventListener('DOMContentLoaded', () => {
    deckElement = document.getElementById('deck');
    playerArea = document.getElementById('player-cards');
    boardArea = document.getElementById('board-cards');
    oddsElement = document.getElementById('odds');
    descriptionElement = document.getElementById('hand-description')?.querySelector('p');
    trendsElement = document.getElementById('trend-list');

    const toggleBtn = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener('click', () => {
            navLinks.classList.toggle('hidden');
        });
    }

    if (deckElement) createDeck();
});

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

            if (suit === 'h' || suit === 'd') {
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

        if (selected.player.length === 0 && selected.board.length === 0) {
            document.querySelector('.reset').classList.add('hidden2');
        }

        return;
    }

    if (selected.player.length < 2) {
        selected.player.push(card);
        const el = cloneCard(card);
        if (card[1] === 'h' || card[1] === 'd') el.classList.add('red-suit');
        else el.classList.add('black-suit');
        playerArea.appendChild(el);
    } else if (selected.board.length < 5) {
        selected.board.push(card);
        const el = cloneCard(card);
        if (card[1] === 'h' || card[1] === 'd') el.classList.add('red-suit');
        else el.classList.add('black-suit');
        boardArea.appendChild(el);
    } else {
        alert('Maksymalna liczba kart została osiągnięta.');
        return;
    }

    cardDiv.classList.add('selected');
    updateSimulation();

    if (selected.player.length > 0 || selected.board.length > 0) {
        document.querySelector('.reset').classList.remove('hidden2');
    }
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
    const playerInput = document.getElementById('players');
    const players = playerInput ? parseInt(playerInput.value) || 2 : 2;
    simulateVsOpponents(selected.player, selected.board, players);

}

function monteCarloSimulation(samples) {
    const deck = generateDeck().filter(card =>
        !selected.player.includes(card) && !selected.board.includes(card)
    );
    const hand = [...selected.player, ...selected.board];
    const stats = {
        "Para": 0, "Dwie pary": 0, "Trójka": 0,
        "Strit": 0, "Kolor": 0, "Full": 0,
        "Kareta": 0, "Poker": 0
    };

    for (let i = 0; i < samples; i++) {
        const remaining = [...deck];
        shuffleArray(remaining);
        const additional = remaining.slice(0, 5 - selected.board.length);
        const fullHand = hand.concat(additional);
        const handType = evaluateHand(fullHand);
        stats[handType]++;
    }

    Object.keys(stats).forEach(key => {
        stats[key] = (stats[key] / samples) * 100;
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
    let best = null;

    for (const combo of combinations) {
        const evalResult = getRankDetails(combo);
        if (!best || compareHands(evalResult, best) > 0) {
            best = evalResult;
        }
    }

    const names = [
        'Nic', 'Para', 'Dwie pary', 'Trójka',
        'Strit', 'Kolor', 'Full', 'Kareta', 'Poker'
    ];

    return names[best.rank];
}

function checkStraight(indices) {
    const unique = [...new Set(indices)].sort((a, b) => a - b);
    if (unique.length < 5) return false;

    for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i + 4] - unique[i] === 4) return true;
    }

    return unique.includes(0) && unique.includes(1) && unique.includes(2) &&
        unique.includes(3) && unique.includes(12);
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
    let bestEval = getRankDetails(best);

    for (let combo of combos) {
        const r = getRankDetails(combo);
        if (compareHands(r, bestEval) > 0) {
            best = combo;
            bestEval = r;
        }
    }

    return best;
}


function getRankDetails(hand) {
    if (hand.length !== 5) throw new Error("Hand must contain exactly 5 cards")
    const valuesOrder = '23456789TJQKA';
    const vals = hand.map(c => c[0]);
    const suits = hand.map(c => c[1]);

    const valCounts = {};
    const suitCounts = {};
    vals.forEach(v => valCounts[v] = (valCounts[v] || 0) + 1);
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);

    const countGroups = Object.entries(valCounts)
        .map(([val, count]) => ({
            value: valuesOrder.indexOf(val),
            count
        }))
        .sort((a, b) => b.count - a.count || b.value - a.value);

    const sortedValues = countGroups.map(c => c.value);

    const isFlush = Object.values(suitCounts).some(c => c >= 5);
    const indices = vals.map(v => valuesOrder.indexOf(v)).sort((a, b) => b - a);
    const unique = [...new Set(indices)];
    let straightHigh = null;

    for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i] - unique[i + 4] === 4) {
            straightHigh = unique[i];
            break;
        }
    }

    if (!straightHigh &&
        unique.includes(12) &&
        unique.includes(0) &&
        unique.includes(1) &&
        unique.includes(2) &&
        unique.includes(3)) {
        straightHigh = 3;
    }

    const flushSuit = Object.entries(suitCounts).find(([s, c]) => c >= 5)?.[0];
    let flushCards = [];
    if (flushSuit) {
        flushCards = hand
            .filter(c => c[1] === flushSuit)
            .map(c => valuesOrder.indexOf(c[0]))
            .sort((a, b) => b - a);
    }

    if (flushCards.length >= 5) {
        const uniqFlush = [...new Set(flushCards)];
        for (let i = 0; i <= uniqFlush.length - 5; i++) {
            if (uniqFlush[i] - uniqFlush[i + 4] === 4) {
                return { rank: 8, tiebreakers: [uniqFlush[i]] };
            }
        }

        if (
            uniqFlush.includes(12) &&
            uniqFlush.includes(0) &&
            uniqFlush.includes(1) &&
            uniqFlush.includes(2) &&
            uniqFlush.includes(3)
        ) {
            return { rank: 8, tiebreakers: [3] };
        }
    }

    if (countGroups[0].count === 4) {
        return { rank: 7, tiebreakers: [countGroups[0].value, countGroups[1].value] };
    }

    if (countGroups[0].count === 3 && countGroups[1].count >= 2) {
        return { rank: 6, tiebreakers: [countGroups[0].value, countGroups[1].value] };
    }

    if (flushCards.length >= 5) {
        return { rank: 5, tiebreakers: flushCards.slice(0, 5) };
    }

    if (straightHigh !== null) {
        return { rank: 4, tiebreakers: [straightHigh] };
    }

    if (countGroups[0].count === 3) {
        return {
            rank: 3,
            tiebreakers: [
                countGroups[0].value,
                countGroups[1]?.value || 0,
                countGroups[2]?.value || 0
            ]
        };
    }

    if (countGroups[0].count === 2 && countGroups[1].count === 2) {
        return {
            rank: 2,
            tiebreakers: [
                countGroups[0].value,
                countGroups[1].value,
                countGroups[2]?.value || 0
            ]
        };
    }

    if (countGroups[0].count === 2) {
        return {
            rank: 1,
            tiebreakers: [
                countGroups[0].value,
                countGroups[1]?.value || 0,
                countGroups[2]?.value || 0,
                countGroups[3]?.value || 0
            ]
        };
    }

    return { rank: 0, tiebreakers: sortedValues.slice(0, 5) };
}

function compareHands(handA, handB) {
    if (handA.rank !== handB.rank) {
        return handA.rank > handB.rank ? 1 : -1;
    }

    const minLength = Math.min(handA.tiebreakers.length, handB.tiebreakers.length);
    for (let i = 0; i < minLength; i++) {
        if (handA.tiebreakers[i] > handB.tiebreakers[i]) return 1;
        if (handA.tiebreakers[i] < handB.tiebreakers[i]) return -1;
    }

    return handA.tiebreakers.length === handB.tiebreakers.length ? 0 :
        (handA.tiebreakers.length > handB.tiebreakers.length ? 1 : -1);
}




function renderResults(stats) {
    if (!oddsElement || !descriptionElement || !trendsElement) return;

    oddsElement.innerHTML = '';
    Object.entries(stats).forEach(([hand, val]) => {
        if (hand === 'Nic') return;
        oddsElement.innerHTML += `<li>${hand}: ${val.toFixed(2)}%</li>`;
    });

    descriptionElement.textContent = 'Symulacja Monte Carlo na podstawie 10,000 rozgrywek.';
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
        's': 'spades',
        'h': 'hearts',
        'd': 'diamonds',
        'c': 'clubs'
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
    document.getElementById('strength-bar').style.width = '0%';
    document.getElementById('winrate-text').textContent = '---';

    document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));

    createDeck();

    document.querySelector('.reset').classList.add('hidden2');
}



function formatCardHTML(card) {
    const filename = cardToFilename(card);
    return `<img src="./cards/${filename}.svg" class="card-img">`;
}


function simulateVsOpponents(myHand, board, playerCount = 2, samples = 5000) {
    const fullDeck = generateDeck().filter(c =>
        !myHand.includes(c) && !board.includes(c)
    );

    if (playerCount < 2) {
        console.error("Musi być co najmniej 2 graczy");
        return;
    }

    let wins = 0, ties = 0, losses = 0;

    for (let i = 0; i < samples; i++) {
        const deck = structuredClone(fullDeck);
        shuffleArray(deck);

        const missingCommunity = 5 - board.length;
        const additionalBoard = deck.splice(0, missingCommunity);
        const fullBoard = [...board, ...additionalBoard];

        const myBest = getBestHand([...myHand, ...fullBoard]);
        const myEval = getRankDetails(myBest);

        let hasLost = false;
        let hasTied = false;

        for (let p = 1; p < playerCount; p++) {
            const opp = [deck.shift(), deck.shift()];
            const oppBest = getBestHand([...opp, ...fullBoard]);
            const oppEval = getRankDetails(oppBest);

            const comparison = compareHands(myEval, oppEval);
            if (comparison < 0) {
                hasLost = true;
                break;
            } else if (comparison === 0) {
                hasTied = true;
            }
        }

        if (hasLost) losses++;
        else if (hasTied) ties++;
        else wins++;
    }

    const winrate = (wins / samples) * 100;
    const tieRate = (ties / samples) * 100;
    const lossRate = (losses / samples) * 100;

    document.getElementById('winrate-text').textContent =
        `Szansa wygranej ${winrate.toFixed(1)}%\nSzansa remisu ${tieRate.toFixed(1)}%\nSzansa przegranej ${lossRate.toFixed(1)}%`;

    document.getElementById('strength-bar').style.width = `${winrate.toFixed(1)}%`;
}




function startGlobalCounter() {
    const counter = document.getElementById('active-users');
    if (!counter) return;

    const base = 384;
    const maxFluctuation = 10;

    function getSyncedValue() {
        const now = Date.now();
        const slowTime = now / 15000;
        const offset = Math.sin(slowTime) * maxFluctuation;
        return Math.round(base + offset);
    }

    function updateCounter() {
        counter.innerHTML = `Aktualnie osób korzysta: ${getSyncedValue()}`;
        setTimeout(updateCounter, 15000);
    }

    updateCounter();
}

document.addEventListener('DOMContentLoaded', startGlobalCounter);



