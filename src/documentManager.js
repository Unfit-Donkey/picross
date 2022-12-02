let gameMode = "mainMenu";
function showMenu(id) {
    if(id == "none") {
        $("#main_menu").hide();
        return;
    }
    $(".menu_page").hide();
    $("#" + id).show();
    $("#main_menu").show();
}
function convertColor(n) {
    $("#textRender").css("background", n);
    return window.getComputedStyle($("#textRender")[0]).backgroundColor;
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
    let firstPage = ["puzzle_data_enteror", "puzzle_creator", "puzzle_creator"];
    for(let i in types) $('.' + types[i]).hide();
    $("." + type).show();
    showMenu(firstPage[types.indexOf(type)]);
    updateAxisSizeList(3);
}
function updateAxisSizeList(dim) {
    dim = Math.min(dim, 10);
    let text = "";
    for(let i = 0; i < dim; i++) {
        text += "<li><input type='number' min='1' max='32' placeholder='4' tabindex='" + (110 + i) + "'></li>";
    }
    $("#axis_size_list").html(text);
}
function createPuzzle() {
    if((data = $("#puzzle_data").val()) != "") {
        try {
            fullPuzzle = Puzzle.fromBase64(data);
        } catch(e) {
            printError("Invalid puzzle string");
            throw e;
        }
    }
    else {
        let dimension = Number($("#puzzle_dimension").val() || 3);
        if(dimension > 10 || dimension < 1) {
            return printError("Dimension must be from 1-10");
        }
        let axises = $("#axis_size_list")[0];
        let size = [];
        for(let i = 0; i < axises.children.length; i++) {
            size[i] = Number(axises.children[i].children[0].value || 4);
            if(size[i] < 1 || size[i] > 32) {
                return printError("Axis size must be from 1-32");
            }
        }
        console.log("New puzzle: ", name, dimension, size);
        fullPuzzle = new Puzzle(dimension, size, name);
        fullPuzzle.shape.fill(cell_unsure);
        fullPuzzle.hintsTotal.fill(0);
        fullPuzzle.hintsPieces.fill(0);
    }
    scene.recreate(true);
    slicer.create(fullPuzzle);
    $("#main_menu").hide();
}
function timeText(time) {
    time = Math.round(time);
    return (time > 3600 ? Math.floor(time / 3600) + "h " : "") +//Hours
        (time > 60 ? (Math.floor(time / 60) % 60) + "m " : "") +//Minutes
        time % 60 + "s";//Seconds
}
function printError(message) {
    $("#error").html(message);
    $("#error").css({"transition": "none", "opacity": "1"});
    error.offsetHeight;
    $("#error").css({"transition": "opacity 1s ease 2s", "opacity": "0"});
}
const keyboardCommands = [
    {key: "p", func: pastePuzzle, type: "sandbox"},
    {key: "y", func: copyPuzzle, type: "sandbox"},
    {key: "h", func: _ => window.open("https://benjamin-cates.github.io/picross/guide", "_blank")},
    {key: "d", func: _ => slicer.update(slicer.focusedSlice, null, "dec")},
    {key: "a", func: _ => slicer.update(slicer.focusedSlice, null, "inc")},
    {key: "w", func: _ => slicer.update(slicer.focusedSlice - 1)},
    {key: "s", func: _ => slicer.update(slicer.focusedSlice + 1)},
    {key: "escape", allowInMenu: true, func: _ => $('#main_menu').hide()},
    {key: "e", func: _ => {showMenu("main");}},
];
onkeydown = function (e) {
    if(!input) return;
    input.latestEvent = e;
    input.pmouseX = input.mouseX;
    input.pmouseY = input.mouseY;
    let key = e.key.toLowerCase();
    let isInMenu = $('#main_menu').css("display") != "none";
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
    if(input) input.latestEvent = e;
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
    navigator.clipboard.writeText(fullPuzzle.toBase64());
}
function pastePuzzle() {
    navigator.clipboard.readText().then(str => {
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
function loadPlayer() {
    let data = $("#puzzle_player_data").val();
    try {
        solvedPuzzle = Puzzle.fromBase64(data);
    }
    catch(e) {
        printError("Invalid puzzle");
        throw e;

    }
}
const cell_unsure = 3;
const cell_colored = 2;
const cell_broken = 1;