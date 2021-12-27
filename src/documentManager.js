let gameMode = "mainMenu";
function showOne(list, id) {
    let els = document.getElementsByClassName(list);
    for(let i = 0; i < els.length; i++) els[i].style.display = "none";
    fromId(id).style.display = "block";
}
function show(id) {
    fromId(id).style.display = "block";
}
function showPopup(id) {
    if(id == "none") {
        hide("popup_background");
        hide("popup_box");
        return;
    }
    hideAll("popup_page");
    show(id);
    show("popup_background");
    show("popup_box");
}

function hideAll(classId) {
    let list = Array.from(document.getElementsByClassName(classId));
    for(let i in list) list[i].style.display = "none";
}
function showAll(classId) {
    let list = Array.from(document.getElementsByClassName(classId));
    for(let i in list) list[i].style.display = "block";
}
function hide(id) {
    fromId(id).style.display = "none";
}
function fromId(i) {
    return document.getElementById(i);
}
function fromClass(i) {
    return document.getElementsByClassName(i);
}
function convertColor(n) {
    let el = document.getElementById("clipboard");
    el.style.background = n;
    return window.getComputedStyle(el).backgroundColor;
}
window.PuzzleMeta = [
    {name: "color", placeholder: "hex or word", default: "rgb(187,255,153)", onchange: _ => scene.setPaintColor()},
    {name: "metalness", placeholder: "0.5", default: 0.5, onchange: _ => scene.setPaintColor()},
    {name: "background", placeholder: "https://", default: null, onchange: _ => scene.setBackground()},
    {name: "roughness", placeholder: "0", default: 0, onchange: _ => scene.setPaintColor()},
    {name: "name", placeholder: "Puzzle", defualt: "Puzzle"},
];
function editMetadata(name, value) {
    fullPuzzle.metadata[name] = value;
    for(let i in PuzzleMeta) if(PuzzleMeta[i].name == name) if(PuzzleMeta[i].onchange)
        PuzzleMeta[i].onchange(value);
}
function generateMetaInputs() {
    let out = "";
    for(let i in PuzzleMeta) {
        let n = PuzzleMeta[i].name;
        out += `
        <label for="puzzle_${n}">${n}: </label><input type="text" id="puzzle_${n}" placeholder="${PuzzleMeta[i].placeholder}" oninput="editMetadata('${n}',this.value)"`;
        if(fullPuzzle.metadata[n])
            out += ` value="${fullPuzzle.metadata[n]}"`;
        out += `><br>`;
    }
    return out;
}
//converts "rgba(128,0,0)" to 0x800000
function rgbaToHex(text) {
    let results;
    if(text.startsWith("rgba"))
        results = /rgba\(([0-9]{1,3}),\s?([0-9]{1,3}),\s?([0-9]{1,3}),\s?([0-9]{1,3})/i.exec(text);
    else if(text.startsWith("rgb"))
        results = /rgb\(([0-9]{1,3}),\s?([0-9]{1,3}),\s?([0-9]{1,3})/i.exec(text);
    let arr = [0, 0, 0];
    if(results) {
        for(let i = 1; i < results.length; i++) arr[i - 1] = parseInt(results[i], 10);
    }
    let out = "";
    for(let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
    return parseInt(out, 16);
}
function openGameMode(type) {
    let types = ["player", "creator", "solver"];
    if(!types.includes(type)) return printError(type + " is not a valid game mode");
    gameMode = type;
    let firstPage = ["puzzle_data_enteror", "puzzle_creator_popup", "puzzle_creator_popup"];
    for(let i in types) hideAll(types[i]);
    showAll(type);
    showPopup(firstPage[types.indexOf(type)]);
    updateAxisSizeList(3);
}
function updateAxisSizeList(dim) {
    dim = Math.min(dim, 10);
    let text = "";
    for(let i = 0; i < dim; i++) {
        text += "<li><input type='number' min='1' max='32' placeholder='4' tabindex='" + (110 + i) + "'></li>";
    }
    fromId("axis_size_list").innerHTML = text;
}
function createPuzzle() {
    const errorOutput = fromId("create_puzzle_error");
    if(document.getElementById("puzzle_data").value != "") {
        try {
            fullPuzzle = Puzzle.fromBase64(document.getElementById("puzzle_data").value);
        } catch(e) {
            printError("Invalid puzzle string");
            throw e;
        }
    }
    else {
        let dimension = Number(fromId("puzzle_dimension").value || 3);
        if(dimension > 10 || dimension < 1) {
            return printError("Dimension must be from 1-10");
        }
        let axises = fromId("axis_size_list");
        let size = [];
        for(let i = 0; i < axises.children.length; i++) {
            size[i] = Number(axises.children[i].children[0].value || 4);
            if(size[i] < 1 || size[i] > 32) {
                return printError("Axis size must be from 1-32");
            }
        }
        console.log("New puzzle: ", name, dimension, size);
        fullPuzzle = new Puzzle(dimension, size, name);
        fullPuzzle.shape.fill(3);
        fullPuzzle.hintsTotal.fill(0);
        fullPuzzle.hintsPieces.fill(0);
    }
    scene.recreate(true);
    slicer.create(fullPuzzle);
    hide("popup_box");
    hide("popup_background");
}
function timeText(time) {
    let out = "";
    time = Math.round(time);
    out += (time % 60) + "s";
    time = Math.floor(time / 60);
    if(time != 0) {
        out = (time % 60) + "m " + out;
        time = Math.floor(time / 60);
    }
    if(time != 0) out = time + "h " + out;
    return out;
}
function printError(message) {
    let error = fromId("error");
    error.innerHTML = message;
    error.style.transition = "none";
    error.style.opacity = "1";
    error.offsetHeight;
    error.style.transition = "opacity 1s ease 2s";
    error.style.opacity = "0";
}
const keyboardCommands = [
    {key: "p", func: pastePuzzle, type: "sandbox"},
    {key: "y", func: copyPuzzle, type: "sandbox"},
    {key: "h", func: _ => window.open("https://benjamin-cates.github.io/picross/guide", "_blank")},
    {key: "d", func: _ => slicer.update(slicer.focusedSlice, null, "dec")},
    {key: "a", func: _ => slicer.update(slicer.focusedSlice, null, "inc")},
    {key: "w", func: _ => slicer.update(slicer.focusedSlice - 1)},
    {key: "s", func: _ => slicer.update(slicer.focusedSlice + 1)},
    {key: "escape", allowInMenu: true, func: _ => {if(fromId('main_menu').style.display == "none") {hide("popup_box"); hide("popup_background");} }},
    {key: "e", func: _ => {showPopup("main_menu");}},
];
onkeydown = function (e) {
    input.latestEvent = e;
    input.pmouseX = input.mouseX;
    input.pmouseY = input.mouseY;
    let key = e.key.toLowerCase();
    let isInMenu = fromId('popup_box').style.display != "none";
    for(let i = 0; i < keyboardCommands.length; i++) {
        if(isInMenu && keyboardCommands[i].allowInMenu != true) continue;
        if(key == keyboardCommands[i].key) keyboardCommands[i].func();
    }
    //Digits - slicer specific layer
    if("1234567890".includes(key)) {
        let digit = key.charCodeAt(0) - "1".charCodeAt(0);
        if(digit < fullPuzzle.dimension) slicer.updateDisplay(digit);
    }
    //xyz
    let dim = "xyz";
    for(let i = 0; i < 3; i++) if(key == dim.charAt(i)) {
        slicer.update(slicer.focusedSlice, -1 - i, "set");
    }
}
onkeyup = function (e) {
    input.latestEvent = e;
}
function solveCurrentPuzzle() {
    Module.setPuzzle(fullPuzzle.toString());
    Module.solve();
    fullPuzzle = Puzzle.fromString(Module.getPuzzle());
    scene.recreate();
}
function getSolveTime(puzzle) {
    Module.setPuzzle(puzzle.toString());
    return Module.solve();
}
function copyPuzzle() {
    let clipboard = document.getElementById("clipboard");
    clipboard.innerText = fullPuzzle.toBase64();
    navigator.clipboard.writeText(fullPuzzle.toBase64());
}
function pastePuzzle() {
    let str = navigator.clipboard.readText().then(str => {
        try {
            fullPuzzle = Puzzle.fromBase64(str);
            scene.recreate(true);
        }
        catch(e) {
            printError("Invalid puzzle");
            console.log(e);

        }
    });
}
function newPuzzle() {
    showOne("popup_page", "puzzle_creator_popup");
    show("popup_box");
    show("popup_background");
    updateAxisSizeList(3);
}
function loadPlayer() {
    let data = fromId("puzzle_player_data").value;
    try {
        solvedPuzzle = Puzzle.fromBase64(data);
        showOne("popup_page", "puzzle_difficulty_enteror");
    }
    catch(e) {
        printError("Invalid puzzle");
        throw e;

    }
}
const cell_unsure = 3;
const cell_colored = 2;
const cell_broken = 1;