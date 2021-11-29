let gameMode = "mainMenu";
function showOne(list, id) {
    let els = document.getElementsByClassName(list);
    for(let i = 0; i < els.length; i++) els[i].style.display = "none";
    fromId(id).style.display = "block";
}
function show(id) {
    fromId(id).style.display = "block";
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
function convertColor(n) {
    let el = document.getElementById("clipboard");
    el.style.background = n;
    return window.getComputedStyle(el).backgroundColor;
}
function openGameMode(type) {
    gameMode = type;
    let types = ["sandbox", "player", "creator", "solver"];
    let firstPage = ["puzzle_creator_popup", "puzzle_data_enteror", "puzzle_creator_popup", "puzzle_creator_popup"];
    for(let i in types) hideAll(types[i]);
    showAll(type);
    showPopup(firstPage[types.indexOf(type)]);
}
function resize() {
    //Compute camera variables
    let frustumSize = 10;
    let aspectRatio = window.innerWidth / window.innerHeight;
    let aspect = Math.sqrt(aspectRatio);
    scene.input.boxSize = window.innerWidth / 2 / frustumSize / aspect;
    //Change camera viewport
    scene.camera.left = -frustumSize * aspect;
    scene.camera.right = frustumSize * aspect;
    scene.camera.top = frustumSize / aspect;
    scene.camera.bottom = -frustumSize / aspect;
    scene.camera.updateMatrixWorld();
    scene.camera.updateProjectionMatrix();
    //Update cardinal directions
    for(let i = 0; i < 3; i++) {
        scene.cardinal[i].position.set(scene.camera.left + 1, scene.camera.bottom + 1, 0);
    }
    scene.renderer.setSize(window.innerWidth, window.innerHeight, true);
}
window.addEventListener("touchstart", e => {
    console.log(e.touches[0]);
    scene.input.mouseX = e.touches[0].clientX - window.innerWidth / 2;
    scene.input.mouseY = -e.touches[0].clientY + window.innerHeight / 2;
});
window.onmousemove = function (e) {
    e.preventDefault();
    scene.input.pmouseX = scene.input.mouseX;
    scene.input.pmouseY = scene.input.mouseY;
    if(e.type == "touchmove") {
        scene.input.mouseX = e.touches[0].clientX - window.innerWidth / 2;
        scene.input.mouseY = -e.touches[0].clientY + window.innerHeight / 2;
    }
    else {
        scene.input.mouseX = e.clientX - window.innerWidth / 2;
        scene.input.mouseY = -e.clientY + window.innerHeight / 2;
    }
    scene.input.latestEvent = e;
    if(e.buttons & 1 == 1 || e.type == "touchmove") {
        if(e.ctrlKey) {

        }
        else if(e.shiftKey) {

        }
        else updateRotation();
    }
}
window.addEventListener("touchmove", window.onmousemove);
const keyboardCommands = [
    {key: "p", func: pastePuzzle, type: "sandbox"},
    {key: "y", func: copyPuzzle, type: "sandbox"},
    {key: "d", func: function () {fromId("slicer_button_"+focusedSlice+"_minus").click();}},
    {key: "a", func: function () {fromId("slicer_button_"+focusedSlice+"_plus").click();}},
    {key: "w", func: _ => {if(focusedSlice != 0) {focusedSlice--; updateSlicer();} }},
    {key: "s", func: _ => {if(focusedSlice != fullPuzzle.dimension - 1) {focusedSlice++; updateSlicer();} }},
    {key: "escape", func: _ => {hide("popup_box"); hide("popup_background");}},
    {key: "e", func: _ => {showPopup("main_menu");}},
];
onkeydown = function (e) {
    scene.input.latestEvent = e;
    scene.input.pmouseX = scene.input.mouseX;
    scene.input.pmouseY = scene.input.mouseY;
    let key = e.key.toLowerCase();
    for(let i = 0; i < keyboardCommands.length; i++) {
        if(key == keyboardCommands[i].key) keyboardCommands[i].func();
    }
    //Digits - slicer specific layer
    if("1234567890".includes(key)) {
        let digit = key.charCodeAt(0) - "1".charCodeAt(0);
        if(digit < fullPuzzle.dimension) focusedSlice = digit;
        updateSlicer();
    }
    //xyz
    let dim = "xyz";
    for(let i = 0; i < 3; i++) if(key == dim.charAt(i)) {
        fromId("slicer_button_" + focusedSlice + "_" + (-1 - i)).click();
    }
}
onkeyup = function (e) {
    scene.input.latestEvent = e;
}
window.onload = function () {
    createSceneBasics();
    resize();
    window.addEventListener("resize", resize);
    generateSlicer();
    updateSlicer();
    updateScene();

    render();
}
function solveCurrentPuzzle() {
    Module.setPuzzle(fullPuzzle.toString());
    Module.solve();
    fullPuzzle = Puzzle.fromString(Module.getPuzzle());
    updateScene();
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
            updateScene();
        }
        catch(e) {
            console.log(e);
            alert("Invalid puzzle format");

        }
    });
}
function newPuzzle() {
    showOne("popup_page", "puzzle_creator_popup");
    show("popup_box");
    show("popup_background");
    updateAxisSizeList(3);
}