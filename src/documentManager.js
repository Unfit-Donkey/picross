let gameMode = "mainMenu";
function showMenu(id) {
    if(id == "none") {
        $("#main_menu").hide();
        return;
    }
    if(id == "guide")
        $("#guide_iframe").prop("src", function () {return $(this).data("src")});
    $(".menu_page").hide();
    $("#" + id).show();
    $("#main_menu").show();
}
function convertColor(n) {
    $("#textRender").css("background", n);
    return window.getComputedStyle($("#textRender")[0]).backgroundColor;
}
const action = {
    solve: _ => {
        fullPuzzle.smartSolve();
        scene.recreate(true);
    },
    copy: _ => {
        navigator.clipboard.writeText(fullPuzzle.toBase64());
        printMessage("Copied");
    },
    paste: _ => {
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
    },
    set: _ => {
        try {
            fullPuzzle = Puzzle.fromBase64($("#puzzle_data").val());
            if(gameMode == "player") action.updateDifficulty();
        }
        catch(e) {
            printError("Invalid puzzle");
            throw e;

        }
    },
    updateDifficulty: _ => {

    },
    finish: _ => {
        //Color unsure to colored
        fullPuzzle.foreachCell((cell, i) => puzzle.shape[i] = (cell == cell_unsure ? cell_colored : cell));
        //Generate hints
        fullPuzzle.generateHints();
        //Encode and copy to clipboard
        let encoding = puzzle.toBase64();
        navigator.clipboard.writeText(
            "https://benjamin-cates.github.io/picross/?play=" + encoding);
        //Show success message
        printMessage("Puzzle url copied");
    },
    open: _ => {
        if((data = $("#puzzle_data").val()) != "") {
            $("#puzzle_data").val("");
            try {
                fullPuzzle = Puzzle.fromBase64(data);
                if(gameMode=="player") {
                    solvedPuzzle = fullPuzzle;
                    fullPuzzle = solvedPuzzle.fromDifficulty($("#puzzle_difficulty"));
                }
            } catch(e) {
                printError("Invalid puzzle string");
                throw e;
            }
        }
        else {
            if(gameMode == "player") return printError("No puzzle to play!");
            //Confirm dimensionality
            let dimension = Number($("#puzzle_dimension").val() || 3);
            if(dimension > 10 || dimension < 3) {
                return printError("Dimension must be from 3-10");
            }
            let axises = $("#axis_size_list")[0];
            let size = [];
            //Confirm axis sizes
            for(let i = 0; i < axises.children.length; i++) {
                size[i] = Number($("#axis" + i).val() || 4);
                if(size[i] < 1 || size[i] > 32) {
                    return printError("Axis size must be from 1-32");
                }
            }
            //Create puzzle object
            console.log("New puzzle: ", dimension, size);
            fullPuzzle = new Puzzle(dimension, size);
            fullPuzzle.shape.fill(cell_unsure);
            fullPuzzle.hintsTotal.fill(0);
            fullPuzzle.hintsPieces.fill(0);
            //Fill in metadata
            window.PuzzleMeta.forEach(item => {
                fullPuzzle.metadata[item.name] = item.default;
            });
        }
        scene.recreate(true);
        slicer.create(fullPuzzle);
        showMenu("none");
    },
    deleteZeroes: _ => {
        fullPuzzle.deleteZeroedRows();
        scene.recreate();
    },
};
window.PuzzleMeta = [
    {name: "color", placeholder: "hex or word", default: "rgb(187,255,153)", onchange: _ => scene.setPaintColor()},
    {name: "metalness", placeholder: "0.5", default: 0.5, onchange: _ => scene.setPaintColor()},
    {name: "background", placeholder: "https://", default: null, onchange: _ => scene.setBackground()},
    {name: "roughness", placeholder: "0", default: 0, onchange: _ => scene.setPaintColor()},
    {name: "difficulty", placeholder: "0.5", default: 0.5},
    {name: "name", placeholder: "Puzzle", default: "Puzzle"},
];
function editMetadata(name, value) {
    fullPuzzle.metadata[name] = value;
    for(let i in PuzzleMeta) if(PuzzleMeta[i].name == name) if(PuzzleMeta[i].onchange)
        PuzzleMeta[i].onchange(value);
}
function generateMetaInputs() {
    let out = "<table><tbody>";
    for(let i in PuzzleMeta) {
        let n = PuzzleMeta[i].name;
        out += `<tr><td>
        <label for="puzzle_${n}">${n}: </label></td><td><input type="text" id="puzzle_${n}" placeholder="${PuzzleMeta[i].placeholder}" oninput="editMetadata('${n}',this.value)"`;
        if(fullPuzzle.metadata[n])
            out += ` value="${fullPuzzle.metadata[n]}"`;
        out += `></td></tr>`;
    }
    return out + "</tbody></table>";
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
    if(type == "exit") {
        showMenu("main");
        return gameMode = "mainMenu";
    }
    let types = ["player", "creator", "solver"];
    gameMode = type;
    for(let i in types) $('.' + types[i]).hide();
    $("." + type).show();
    showMenu('puzzle_enteror');
    updateAxisSizeList(3);
}
function updateAxisSizeList() {
    let dim = $("#puzzle_dimension").val();
    dim = Math.max(3, Math.min(dim, 10));
    let text = "";
    const names = "xyz4567890";
    for(let i = 0; i < dim; i++) {
        text += "<tr><td>" + names.charAt(i) + "</td><td><input id='axis" + i + "' type='number' min='1' max='32' placeholder='4' tabindex='" + (110 + i) + "'></td></tr>";
    }
    $("#axis_size_list").html(text);
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
function printMessage(message) {
    $("#message").html(message);
    $("#message").css({"transition": "none", "opacity": "1"});
    error.offsetHeight;
    $("#message").css({"transition": "opacity 1s ease 2s", "opacity": "0"});
}
const keyboardCommands = [
    {key: "p", func: action.paste, type: "sandbox"},
    {key: "y", func: action.copy, type: "sandbox"},
    {key: "h", func: _ => showMenu("guide")},
    {key: "d", func: _ => slicer.update(slicer.focusedSlice, null, "dec")},
    {key: "a", func: _ => slicer.update(slicer.focusedSlice, null, "inc")},
    {key: "w", func: _ => slicer.update(slicer.focusedSlice - 1)},
    {key: "s", func: _ => slicer.update(slicer.focusedSlice + 1)},
    {key: "escape", allowInMenu: true, func: _ => gameMode == "mainMenu" ? showMenu('main') : showMenu('none')},
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
    if(gameMode == "mainMenu") return;
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
const cell_unsure = 3;
const cell_colored = 2;
const cell_broken = 1;