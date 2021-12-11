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
function fromClass(i) {
    return document.getElementsByClassName(i);
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
    scene.renderer.setSize(window.innerWidth, window.innerHeight, true);
}
window.addEventListener("touchstart", e => {
    scene.input.mouseX = e.touches[0].clientX - window.innerWidth / 2;
    scene.input.mouseY = -e.touches[0].clientY + window.innerHeight / 2;
    onclick();
});
let slicerGuide = {
    active: false,
    cursorStart: [],
    cursorUnit: [],
    offset: 0,
    selected: 0,
};
function onclick() {
    let caster = new THREE.Raycaster();
    caster.setFromCamera(new THREE.Vector2(scene.input.mouseX / window.innerWidth * 2, scene.input.mouseY / window.innerHeight * 2), scene.camera);
    let intersects = caster.intersectObjects(scene.sliceGuides, false);
    if(intersects.length != 0) {
        let uuid = intersects[0].object.uuid;
        for(let i = 0; i < 3; i++) if(scene.sliceGuides[i].uuid == uuid) slicer.minorDirection = i;
        if(slicer.minorAxis == -1) slicer.minorAxis = slicer.slices.indexOf(-1 - slicer.minorDirection);
        slicerGuide.active = true;
        slicerGuide.cursorStart = [scene.input.mouseX, scene.input.mouseY];
        slicerGuide.offset = Math.max(slicer.slices[slicer.minorAxis], -1);
        let yTheta = scene.input.yRot, xTheta = scene.input.xRot;
        if(slicer.minorDirection == 0) slicerGuide.cursorUnit = [Math.cos(yTheta), Math.sin(yTheta) * Math.sin(xTheta)];
        if(slicer.minorDirection == 1) slicerGuide.cursorUnit = [0, Math.cos(xTheta)];
        if(slicer.minorDirection == 2) slicerGuide.cursorUnit = [Math.sin(yTheta), -Math.cos(yTheta) * Math.sin(xTheta)];
        slicerGuide.cursorUnit[0] *= scene.input.boxSize;
        slicerGuide.cursorUnit[1] *= scene.input.boxSize;
    }
}
window.addEventListener("mousedown", e => {
    scene.input.mouseX = e.clientX - window.innerWidth / 2;
    scene.input.mouseY = - e.clientY + window.innerHeight / 2;
    onclick();
});
window.addEventListener("mouseup", e => {
    slicerGuide.active = false;
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
    if(slicerGuide.active) {
        if(slicer.minorAxis == -1) return slicerGuide.active = false;
        let dim = slicer.minorDirection;
        let mouseDelta = [scene.input.mouseX - slicerGuide.cursorStart[0], scene.input.mouseY - slicerGuide.cursorStart[1]];
        let x = slicerGuide.cursorUnit[0], y = slicerGuide.cursorUnit[1];
        let unitLength = Math.sqrt(x ** 2 + y ** 2);
        let unitAngle = Math.atan(y / x);
        if(x < 0) unitAngle += Math.PI;
        console.log(unitAngle);
        let distance = mouseDelta[0] * Math.cos(unitAngle) + mouseDelta[1] * Math.sin(unitAngle);
        distance /= unitLength;
        //Calculate selected layer
        let cameraFacing = scene.camera.position["xyz".charAt(dim)] > 0;
        if(slicerGuide.offset == -1) {
            if(cameraFacing) distance = puzzle.size[dim] - 1 + distance;
        }
        else distance += slicerGuide.offset;
        slicerGuide.selected = Math.min(Math.max(Math.round(distance), 0), puzzle.size[dim] - 1);
        //Reset if pulled back
        if(distance < -0.5 && !cameraFacing) {
            slicerGuide.selected = 0;
            slicer.update(slicer.minorAxis, -1 - slicer.minorDirection, "set");
        }
        else if(distance >= puzzle.size[dim] && cameraFacing) {
            slicerGuide.selected = puzzle.size[dim] - 1;
            slicer.update(slicer.minorAxis, -1 - slicer.minorDirection, "set");
        }
        //Ignore if no change
        else if(slicer.slices[slicer.minorAxis] == slicerGuide.selected);
        //Edit position
        else slicer.update(slicer.minorAxis, slicerGuide.selected, "set");
        return;
    }
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
    {key: "d", func: _ => slicer.update(slicer.focusedSlice, null, "dec")},
    {key: "a", func: _ => slicer.update(slicer.focusedSlice, null, "inc")},
    {key: "w", func: _ => slicer.update(slicer.focusedSlice - 1)},
    {key: "s", func: _ => slicer.update(slicer.focusedSlice + 1)},
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
        if(digit < fullPuzzle.dimension) slicer.updateDisplay(digit);
    }
    //xyz
    let dim = "xyz";
    for(let i = 0; i < 3; i++) if(key == dim.charAt(i)) {
        slicer.update(slicer.focusedSlice, -1 - i, "set");
    }
}
onkeyup = function (e) {
    scene.input.latestEvent = e;
}
window.onload = function () {
    createSceneBasics();
    resize();
    window.addEventListener("resize", resize);
    window.slicer = new Slicer(fullPuzzle);
    recreateScene();
    render();
}
function solveCurrentPuzzle() {
    Module.setPuzzle(fullPuzzle.toString());
    Module.solve();
    fullPuzzle = Puzzle.fromString(Module.getPuzzle());
    recreateScene();
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
            recreateScene();
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