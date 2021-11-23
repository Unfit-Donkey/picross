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
onkeydown = function (e) {
    scene.input.latestEvent = e;
    scene.input.pmouseX = scene.input.mouseX;
    scene.input.pmouseY = scene.input.mouseY;
    let key = e.key.toLowerCase();
    if(key == "d") // Slider left
        if(slices[focusedSlice] != -3) {slices[focusedSlice]--; updateScene(); updateSlicer();}
    if(key == "a") //Slider right
        if(slices[focusedSlice] != fullPuzzle.size[focusedSlice] - 1) {
            slices[focusedSlice]++;
            updateScene();
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
            updateScene();
            updateSlicer();
        }
    }
    //xyz
    let dim = "xyz";
    for(let i = 0; i < 3; i++) if(key == dim.charAt(i)) {
        if(slices.indexOf(-1 - i) != -1)
            slices[slices.indexOf(-1 - i)] = 0;
        slices[focusedSlice] = -1 - i;
        updateScene();
        updateSlicer();
    }
}
onkeyup = function (e) {
    scene.input.latestEvent = e;
}
document.body.onload = function () {
    createSceneBasics();
    resize();
    window.addEventListener("resize", resize);
    generateSlicer();
    updateScene();

    render();
}