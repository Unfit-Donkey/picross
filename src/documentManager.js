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
var slices = [-1, -2, -3];
var focusedSlice = 0;
function updateSlicer() {
    destroyObjects(scene.voxels, scene.obj);
    puzzle.sliceFrom(slices,fullPuzzle);
    createVoxelScene();
    puzzle.generateSidesVisible();
    updateRotation(true);

    let focusedButtons = document.getElementsByClassName("slicer_button_focused");
    for(let i = focusedButtons.length - 1; i >= 0; i--) focusedButtons[i].classList.remove("slicer_button_focused");
    let focusedLayer = document.getElementsByClassName("focused_layer");
    if(focusedLayer.length != 0) focusedLayer[0].classList.remove("focused_layer");
    let layers = document.getElementsByClassName("slicer_layer");
    for(let i = 0; i < fullPuzzle.dimension; i++) {
        let buttons = layers[i].children;
        buttons[buttons.length - slices[i] - 4].classList.add("slicer_button_focused");
    }
    layers[focusedSlice].classList.add("focused_layer");
}
function generateSlicer() {
    let layers = document.getElementsByClassName("slicer_layer");
    for(let i = 0; i < fullPuzzle.dimension; i++) {
        let xyz = "xyz";
        for(let x = 0; x < fullPuzzle.size[i]; x++) {
            let button = document.createElement("button");
            button.innerText = x + 1;
            button.classList = "slicer_button";
            button.onclick = function () {
                slices[i] = x;
                focusedSlice = i;
                updateSlicer();
            }
            layers[i].prepend(button);
        }
        for(let x = 0; x < 3; x++) {
            let button = document.createElement("button");
            button.innerText = xyz.charAt(x);
            button.classList = "slicer_button";
            button.onclick = function () {
                slices[slices.indexOf(-1 - x)] = 0;
                slices[i] = -1 - x;
                focusedSlice = i;
                updateSlicer();
            }
            layers[i].appendChild(button);
        }
    }
    for(let i = fullPuzzle.dimension; i < layers.length; i++) {
        layers[i].style.display = "none";

    }
}
onkeydown = function (e) {
    scene.input.latestEvent = e;
    let key = e.key.toLowerCase();
    if(key == "d") // Slider left
        if(slices[focusedSlice] != -3) {slices[focusedSlice]--; updateSlicer();}
    if(key == "a") //Slider right
        if(slices[focusedSlice] != fullPuzzle.size[focusedSlice] - 1) {
            slices[focusedSlice]++;
            updateSlicer();
        }
    if(key == "w") //Slider focus up
        if(focusedSlice != 0) {focusedSlice--; updateSlicer();}
    if(key == "s") //Slider focus down
        if(focusedSlice != fullPuzzle.dimension - 1) {focusedSlice++; updateSlicer();}
    //Digits - slicer specific layer
    if("1234567890".includes(key)) {
        let digit = key.charCodeAt(0) - "1".charCodeAt(0);
        if(digit == -1) digit = 9;
        if(digit < fullPuzzle.size[focusedSlice]) {
            slices[focusedSlice] = digit;
            updateSlicer();
        }
    }
    //xyz
    let dim = "xyz";
    for(let i = 0; i < 3; i++) if(key == dim.charAt(i)) {
        if(slices.indexOf(-1 - i) != -1)
            slices[slices.indexOf(-1 - i)] = 0;
        slices[focusedSlice] = -1 - i;
        updateSlicer();
    }
}
onkeyup = function (e) {
    scene.input.latestEvent = e;
}
document.body.onload = function () {
    createSceneBasics();
    createVoxelScene();
    resize();
    window.addEventListener("resize", resize);
    puzzle.generateSidesVisible();
    updateRotation();
    generateSlicer();
    updateSlicer();

    render();
}