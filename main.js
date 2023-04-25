/*
Connect 4 game with a persistent board using Scaledrone
*/


if (!debugConfig) window.debugConfig = {}; //If debug config is not present, assume all options are false

//References to dynamic DOM elements
const DOM = {
    membersList: document.querySelector('#membersList'),
    startButton: document.querySelector('#startButton'),
    cell: (x, y) => document.querySelector('#board .row' + (y + 1) + ' .col' + (x + 1)),
};

let gs = { received: false, order: [], currentTurn: -1, takenColors: [], cells: [], players: [] };


//Name and room selection
function getUsername() {
    let name;
    if (debugConfig.random_username) name = getRandomName();
    else name = prompt(s.enter_username, "");

    while (!name) {
        let name = prompt(s.enter_username_non_empty, "");
    }
    myName = name;
    return (name);
}

function getRandomName() {
    const adjs = ["autumn", "hidden", "bitter", "misty", "silent", "empty", "dry", "dark", "summer", "icy", "delicate", "quiet", "white", "cool", "spring", "winter", "patient"];
    const nouns = ["waterfall", "river", "breeze", "moon", "rain", "wind", "sea", "morning", "snow", "lake", "sunset", "pine", "shadow", "leaf", "dawn", "glitter", "forest", "hill"];
    const name = adjs[Math.floor(Math.random() * adjs.length)] + "_" + nouns[Math.floor(Math.random() * nouns.length)];
    return (name);
}

function getRoomName() {
    //Check if set by debug options
    if (debugConfig.dev_server) return "dev";
    if (debugConfig.random_server) return (Math.random() * 1000) + "";

    //Try to get it from the URL
    let roomFromURL = (new URLSearchParams(window.location.search)).get('room');
    if (roomFromURL) return roomFromURL;

    //If that fails, ask the user for it.
    let chosenName = prompt(s.enter_room_name);
    while (!chosenName) chosenName = prompt(s.enter_room_name);
    let shareableLink = encodeURI(window.location.origin + window.location.pathname + "?room=" + chosenName);
    alert(s.shareable_link + "\n" + shareableLink);
    return chosenName;
}

//Displaying things
function createMemberElement(member) {
    const name = member.clientData.name;
    const el = document.createElement('div');
    let content = name;
    //This is a good place to add extra info about this player by modifying 'el.style' or adding to 'content'
    if (member.id === drone.clientId) content += " (" + s.you + ")";
    el.style.color = 'aqua';
    el.appendChild(document.createTextNode(content));
    el.className = 'member';
    return el;
}

function updateMembersDOM() {
    DOM.membersList.innerHTML = '';
    members.forEach(member => DOM.membersList.appendChild(createMemberElement(member)));
}

function addMessageToListDOM(text, member, important = false, color = 'black') {
    //If the message has line breaks, create a message for each line
    if (text.includes('\n')) {
        let messages = text.split('\n');
        for (let i = 0; i < messages.length; i++) {
            addMessageToListDOM(messages[i], member);
        }
        return;
    }
    const el = document.createElement('div');

    //If a member is supplied, they'll be displayed in front of the message. Feel free to change this behaviour
    if (member) el.appendChild(createMemberElement(member));
    if (important) el.style['font-weight'] = 'bold'; //Bold if marked 'important'
    el.style.color = color; //Apply color

    el.appendChild(document.createTextNode(text));
    el.className = 'message';
    addElementToListDOM(el);
}


function addElementToListDOM(element) {
    const el = DOM.messages;
    const wasTop = el.scrollTop === el.scrollHeight - el.clientHeight;
    el.appendChild(element);
    if (wasTop) {
        el.scrollTop = el.scrollHeight - el.clientHeight;
    }
}

//User input
DOM.startButton.addEventListener("click", function () {
    let message = DOM.exampleInput.value;
    if (message) {
        sendMessage("general", message);
        DOM.exampleInput.value = '';
    }
    else sendMessage("general", s.hello_world);
});

//Translation

let lang = 'en'; //Specify default language here (will be used if requested language is not supported)
const languages = { 'en': enStrings, 'pl': plStrings };
let s = languages[lang];

function initLanguage() {
    let browsers = navigator.language; //Gets browser's language.
    if (languages[browsers]) lang = languages[browsers]; //If not supported, we just keep the default
    translate();
}

function changeLanguage(newLanguage) { //Call this to change current language
    if (!languages[newLanguage]) return;
    lang = newLanguage;
    s = languages[newLanguage];
    translate();
}

function translate() {
    let allDom = document.getElementsByTagName("*");
    for (let i = 0; i < allDom.length; i++) {
        let elem = allDom[i];
        let data = elem.dataset;

        if (data.s) elem.innerHTML = s[data.s];
        if (data.sInnerHTML) elem.innerHTML = s[data.sInnerHTML];
        if (data.sValue) elem.value = s[data.sValue];
        if (data.sPlaceholder) elem.placeholder = s[data.sPlaceholder];
    }
}

initLanguage(); //Must be called before any user interaction

//Game logic
const BOARD_HEIGHT = 15;
const BOARD_WIDTH = 20;
const CELL_COLORS = ["#1be7ff", "#b85173", "#aceca1", "#ffcab1", "#736ac8", "#b79ced"] //Made with https://coolors.co/1be7ff-b85173-aceca1-ffcab1-736ac8-b79ced

for (let i = 0; i < BOARD_WIDTH; i++) {
    gs.cells.push([]);
    for (let j = 0; j < BOARD_HEIGHT; j++) {
        gs.cells[i].push(-1);
    }
}

function setCell(x, y, player) {
    //console.log(DOM.cell(x, BOARD_HEIGHT - 1 - y))
    let color = player >= 0 ? CELL_COLORS[player] : 'transparent';
    console.log("Setting cell ", x, y, color);
    DOM.cell(x, BOARD_HEIGHT - 1 - y).style.backgroundColor = color;
    gs.cells[x][y] = player;
}

function clicked(cell) {
    let x = cell.cellIndex;
    let y = BOARD_HEIGHT - 1 - cell.parentNode.rowIndex
    console.log(cell)

    if (gs.cells[x][BOARD_HEIGHT - 1] >= 0) {
        alert(s.column_full);
        return;
    }

    //setCell(x, y, 2) //Test
    //dropInto(x, 2) //Test

    sendMessage('move', x);


}

function dropInto(col, player) {
    console.assert(gs.cells[col][BOARD_HEIGHT - 1] === -1); //This column should have space
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        if (gs.cells[col][i] === -1) {
            setCell(col, i, player)
            break;
        }
    }
    if (checkWinCondition(gs.cells, player)) console.log(player + " won");
}


//Checks if a specified player has a 4-in-a-row
function checkWinCondition(cells, player) {
    //Check for horizontal 4-in-a-rows
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        let count = 0;
        for (let j = 0; j < BOARD_WIDTH; j++) {
            if (cells[j][i] == player) count++;
            else count = 0;

            if (count === 4) return true;
        }
    }
    //Check for vertical 4-in-a-rows
    for (let i = 0; i < BOARD_WIDTH; i++) {
        let count = 0;
        for (let j = 0; j < BOARD_HEIGHT; j++) {
            if (cells[i][j] == player) count++;
            else count = 0;

            if (count === 4) return true;
        }
    }
    //Check for diagonal 4-in-a-rows (with positive slope)
    for (let i = 0; i < BOARD_WIDTH - 3; i++) {
        for (let j = 0; j < BOARD_HEIGHT - 3; j++) {
            if (cells[i][j] == player &&
                cells[i + 1][j + 1] == player &&
                cells[i + 2][j + 2] == player &&
                cells[i + 3][j + 3] == player)
                return true;
        }
    }
    //Check for diagonal 4-in-a-rows (with negative slope)
    for (let i = 0; i < BOARD_WIDTH - 3; i++) {
        for (let j = 3; j < BOARD_HEIGHT; j++) {
            if (cells[i][j] == player &&
                cells[i + 1][j - 1] == player &&
                cells[i + 2][j - 2] == player &&
                cells[i + 3][j - 3] == player)
                return true;
        }
    }
}

//Checks if any player meets the win condition
function checkWin() {
    for (let i = 0; i < gs.players.length; i++) {
        if (checkWinCondition(gs.cells, i)) {
            console.log(s.win + gs.players[i].name);
            return true;
        }
    }
    return false;
}

//Shuffles a list
function shuffleList(list) {
    let res = [];
    while (list.length > 0) {
        let index = Math.floor(Math.random() * list.length);
        res.push(list[index]);
        list.splice(index, 1);
    }
    return res;

}

function getFreeColors() {
    let res = Array.from(Array(CELL_COLORS.length).keys())
    for (let taken of gs.takenColors) {
        res.splice(res.indexOf(taken), 1)
    }
    return res;
}

function newGame() {
    gs.players.push()
    //TODO
}

//Networking
const ROOM_BASE = 'observable-main-'
const CHANNEL_ID = 'Utdj6PGjWhrKVYXj';
let roomName = ROOM_BASE + getRoomName();

function getMember(input) {
    let id = input;
    if (typeof input === 'object') id = input.id;
    let res = members.find(m => m.id === id);
    if (!res) console.error('Member with id ' + id + ' not found.');
    return res;
}

function isDebugger(member) {
    return member.authData && member.authData.user_is_from_scaledrone_debugger;
}

function sendMessage(type, content) {
    if (debugConfig.disable_messages) return;
    let message = { type: type, content: content };
    if (members.length === 1) receiveMessage(message, members[0]); //Won't send anything over the network if we're the only player
    else drone.publish({ room: roomName, message: message });
}

const drone = new ScaleDrone(CHANNEL_ID, {
    data: { // Will be sent out as clientData via events
        name: getUsername(),
    },
});

drone.on('open', error => {
    if (error) {
        return console.error(error);
    }
    console.log('Successfully connected to Scaledrone');

    const room = drone.subscribe(roomName);
    room.on('open', error => {
        if (error) {
            return console.error(error);
        }
        console.log('Successfully joined room');
    });

    // List of currently online members, emitted once
    room.on('members', m => {
        members = m.filter(x => !isDebugger(x));
        if (members.length === 1) {
            //This is what happens when the player joins an empty room
            gs.received = true;
            members[0].color = getFreeColors()[0]; // TODO UI for color choice?
            gs.takenColors.push(members[0].color);
            newGame();
        }
        updateMembersDOM();
    });

    // User joined the room
    room.on('member_join', member => {
        if (isDebugger(member)) return;
        members.push(member);
        //addMessageToListDOM(s.joined_game, member);
        if (gs.received) {
            gs.memberData = members;
            sendMessage('welcome', gs);
        }
        updateMembersDOM();
    });

    // User left the room
    room.on('member_leave', ({ id }) => {
        if (!getMember(id)) return; //If they don't exist, it was probably the debugger
        //addMessageToListDOM(s.left_game, getMember(id));
        const index = members.findIndex(member => member.id === id);
        members.splice(index, 1);
        updateMembersDOM();
    });

    room.on('data', receiveMessage);

});

function receiveMessage(data, serverMember) {
    if (debugConfig.log_messages) console.log(data);
    if (serverMember) {
        let member = getMember(serverMember);
        //console.log(member);
        switch (data.type) {
            case 'debug':
                console.log(data.content);
                break;
            case 'move': // A player made a move
                dropInto(data.content, member.color);
                break;
            case 'colorChosen': //A new player has chosen their color
                member.color = data.content;
                break;
            case 'welcome': //Sent whenever a new player joins the game, informing them of the game state
                if (!gs.received) {
                    //This is what happens after the player joins a non-empty room
                    gs = data.content;
                    let memberData = gs.memberData;
                    for (let i = 0; i < memberData.length; i++) {
                        getMember(memberData[i]).color = memberData[i].color;
                        getMember(memberData[i]).score = memberData[i].score;
                    }

                    let myColor = getFreeColors()[0];
                    sendMessage('colorChosen', myColor);
                    //updateAllUI();
                }
                break;
            default: console.error('Unkown message type received: ' + data.type);
        }
    } else {
        //addMessageToListDOM('Server: ' + data.content);
    }
}

















