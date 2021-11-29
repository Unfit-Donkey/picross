import * as THREE from "../three.js/build/three.module.js";
import {Puzzle} from "./picross.js";
const cell_broken = 1;
const cell_colored = 2;
const cell_unsure = 3;
window.Puzzle = Puzzle;
window.THREE = THREE;
window.puzzle = new Puzzle(3, [12, 7, 5]);
window.fullPuzzle = Puzzle.fromBase64('eJwzrvP1cKvT1h0Fgx3UOcKBExA4A4G7k7uTMxA6OYFE3Z28nNyc3ZyxySH0gWhnJDEEcHbyAOsAQVcnhB4QzxkOQaaD+LjU4zYfKO6MycIn7uKEgLjEIQDkTnRVMP+6OLk5oYtCwsHVGV29o2N1LQBBAKlv');

window.scene = {
    camera: null,
    obj: null,
    renderer: null,
    voxels: [],
    materials: {
        unsure: new THREE.MeshStandardMaterial({color: 0xffffff}),
        painted: new THREE.MeshStandardMaterial({color: 0xbbff99, metalness: 0.5, roughness: 0}),
        selected: new THREE.MeshStandardMaterial({color: 0xff0000}),
        wire: new THREE.LineBasicMaterial({color: 0x444444, linewidth: 2}),
        text: [],
        textUnsure: [],
        textPainted: [],
    },
    geometry: {
    },
    debug: {
    },
    cardinal: [],
    input: {
        xRot: 0,
        yRot: 0,
        boxSize: 0,
        mouseX: 0,
        pmouseX: 0,
        mouseY: 0,
        pmouseY: 0,
        selectedBlock: -1,
        latestEvent: {},
    }
};

window.render = function () {
    if(scene.input.latestEvent.shiftKey || scene.input.latestEvent.ctrlKey) {
        let cursorPos = getCursorPosition();
        let direction = new THREE.Vector3(0, 0, 0).copy(scene.camera.position).multiplyScalar(-1).normalize();
        let intersection = puzzle.rayIntersect(cursorPos, direction.toArray());
        if(intersection.pos != -1) if(scene.input.selectedBlock != intersection.pos || scene.input.selectedFace != intersection.face) {
            //scene.voxels[scene.input.selectedBlock].material = scene.materials.selected;
            scene.faceSelector.position.copy(scene.voxels[intersection.pos].position);
            scene.faceSelector.position["xxyyzz".charAt(intersection.face)] += 0.51 * (intersection.face % 2 == 0 ? -1 : 1);
            let rot = new THREE.Euler(0, 0, 0);
            rot["yyxxzz".charAt(intersection.face)] = Math.PI / 2;
            scene.faceSelector.setRotationFromEuler(rot);
        }
        scene.input.selectedBlock = intersection.pos;
        scene.input.selectedFace = intersection.face;
    }
    else scene.input.selectedBlock = -1;
    requestAnimationFrame(render);
    scene.renderer.clear();
    scene.renderer.render(scene.obj, scene.camera);
}
window.destroyObjects = function (object, scene) {
    if(typeof object != "object") return;
    else if(object instanceof THREE.Mesh || object instanceof THREE.Line) scene.remove(object);
    else if(object instanceof THREE.Object3D) return;
    else if(object instanceof THREE.Material) return;
    else for(let i in object) destroyObjects(object[i], scene);
}
window.createSceneBasics = function () {
    //Camera, scene, and renderer
    scene.renderer = new THREE.WebGLRenderer({antialias: true});
    scene.renderer.setClearColor(0xffffff);
    scene.camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    scene.obj = new THREE.Scene();
    scene.obj.add(scene.camera);
    scene.camera.position.set(50, 0, 0);
    document.body.appendChild(scene.renderer.domElement);
    //Lighting
    scene.ambientLight = new THREE.AmbientLight(0x999999, 1);
    scene.obj.add(scene.ambientLight);
    scene.light = new THREE.PointLight(0xfff8ee, 1, 0, 1);
    scene.camera.add(scene.light);
    scene.light.position.set(0, 10, -30);
    //Cardinal indicator
    const cardinalColors = [0xFF0000, 0x00FF00, 0x0000FF];
    const directions = ['x', 'y', 'z'];
    for(let i = 0; i < 3; i++) {
        let endPosition = new THREE.Vector3();
        endPosition[directions[i]] = 1;
        scene.cardinal[i] = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), endPosition]),
            new THREE.LineBasicMaterial({color: cardinalColors[i]})
        );
        scene.camera.add(scene.cardinal[i]);
    }
    //Debug objects
    scene.faceSelector = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), new THREE.MeshStandardMaterial({color: 0x0000FF, side: THREE.DoubleSide}));
    scene.obj.add(scene.faceSelector);
    //scene.debug.cursorIndicator=new THREE.Mesh(geometry,scene.materials.painted);
    //scene.obj.add(scene.debug.cursorIndicator);
}
window.updateVoxels = function () {
    destroyObjects(scene.voxels, scene.obj);
    puzzle.generateSidesVisible();
    scene.geometry.box = new THREE.BoxGeometry(1, 1, 1);
    scene.geometry.wire = new THREE.EdgesGeometry(scene.geometry.box);
    scene.geometry.wire.scale(1.001, 1.001, 1.001);
    //Loop through voxels
    const size = puzzle.size;
    for(let x = 0; x < size[0]; x++) for(let y = 0; y < size[1]; y++) for(let z = 0; z < size[2]; z++) {
        //Find array index of voxels
        let position = x + (y + z * size[1]) * size[0];
        scene.voxels[position] = voxelMesh(x, y, z, position);
        scene.obj.add(scene.voxels[position]);
    }
}
window.updateScene = function (reset = false) {
    if(reset) {
        slices = [-1, -2, -3];
        for(let i = 3; i < fullPuzzle.dimension; i++) slices.push(0);
    }
    puzzle.sliceFrom(slices, fullPuzzle);
    updateVoxels();
    updateRotation(true);
}
function voxelMesh(x, y, z, position) {
    let cell = puzzle.shape[position];
    let materials = [];
    for(let i = 0; i < 3; i++) {
        let hint = puzzle.getHintPosition(position, i);
        let material = getVoxelTexture(puzzle.hintsTotal[hint], puzzle.hintsPieces[hint], cell);
        materials[i * 2] = material;
        materials[i * 2 + 1] = material;
    }
    let mesh = new THREE.Mesh(scene.geometry.box, materials);
    let pos = new THREE.Vector3(x - puzzle.size[0] / 2 + 0.5, y - puzzle.size[1] / 2 + 0.5, z - puzzle.size[2] / 2 + 0.5);
    mesh.position.copy(pos);

    mesh.add(new THREE.LineSegments(scene.geometry.wire, scene.materials.wire));
    return mesh;
}
function getVoxelTexture(hint, hintPieces, cellType) {
    if(cellType == cell_unsure) {
        if(hintPieces == 0) return scene.materials.unsure;
        else if(scene.materials.textUnsure[hint] == null) {
            scene.materials.textUnsure[hint] = new THREE.MeshStandardMaterial().copy(scene.materials.unsure);
            let texture = getTextTexture(hint);
            scene.materials.textUnsure[hint].map = texture;
        }
        return scene.materials.textUnsure[hint];

    }
    if(cellType == cell_colored) {
        if(hintPieces == 0) return scene.materials.painted;
        else if(scene.materials.textPainted[hint] == null) {
            scene.materials.textPainted[hint] = new THREE.MeshStandardMaterial().copy(scene.materials.painted);
            let texture = getTextTexture(hint);
            scene.materials.textPainted[hint].map = texture;
        }
        return scene.materials.textPainted[hint];

    }

}
window.getTextTexture = function (num) {
    let context = document.getElementById("textRender").getContext("2d");
    context.clearRect(0, 0, 50, 50);
    context.font = "40px Consolas";
    context.fillStyle = "black";
    context.textAlign = "center";
    context.fillText(num, 25, 40);
    let imageData = context.getImageData(0, 0, 50, 50).data;
    let grayscale = new Uint8Array(50 * 50);
    for(let x = 0; x < 50; x++) for(let y = 0; y < 50; y++) grayscale[x + y * 50] = 255 - imageData[(x + (49 - y) * 50) * 4 + 3];
    let texture = new THREE.DataTexture(grayscale, 50, 50, THREE.LuminanceFormat, THREE.UnsignedByteType);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    return texture;
}
window.updateRotation = function (forceSceneRegeneration) {
    let oldVisibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
    const mouseSpeed = 0.006;
    let inp = scene.input;
    inp.yRot -= (inp.pmouseX - inp.mouseX) * mouseSpeed;
    inp.xRot += (inp.pmouseY - inp.mouseY) * mouseSpeed;
    if(inp.xRot > Math.PI / 2) inp.xRot = Math.PI / 2;
    if(inp.xRot < -Math.PI / 2) inp.xRot = -Math.PI / 2;
    inp.yRot = (inp.yRot + Math.PI * 2) % (Math.PI * 2);
    scene.camera.position.set(Math.sin(inp.yRot) * - Math.cos(inp.xRot), Math.sin(inp.xRot), Math.cos(inp.xRot) * Math.cos(inp.yRot));
    scene.camera.position.multiplyScalar(50);
    scene.camera.lookAt(0, 0, 0);
    scene.camera.updateProjectionMatrix();
    for(let i = 0; i < 3; i++) {
        scene.cardinal[i].setRotationFromEuler(new THREE.Euler(inp.xRot, inp.yRot, 0));
    }
    let visibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
    if(oldVisibleSideMap != visibleSideMap || forceSceneRegeneration) for(let i = 0; i < puzzle.shapeSize; i++) {
        let isVisible = (puzzle.visibleSides[i] & visibleSideMap) == 0 ? false : true;
        scene.voxels[i].visible = isVisible;
    }
}
//Returns the position of the cursor in 3d space
window.getCursorPosition = function () {
    const normalize = vector => {
        let magnitude = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
        return vector.map(v => v / magnitude);
    }
    let inp = scene.input;
    let xRot = inp.xRot;
    let yRot = inp.yRot;
    let xPixelStep = normalize([1, 0, Math.tan(yRot)]);
    //Reverse xPixel step if looking the other way
    if(yRot > Math.PI / 2 && yRot < 3 * Math.PI / 2) {
        xPixelStep[0] = -xPixelStep[0];
        xPixelStep[2] = -xPixelStep[2];
    }
    let yPixelStep = normalize([Math.sin(yRot), 1 / Math.tan(xRot), -Math.cos(yRot)]);
    return yPixelStep.map((yStep, i) =>
        yStep * (Math.sign(xRot) * inp.mouseY / inp.boxSize)
        + xPixelStep[i] * (inp.mouseX / inp.boxSize)
        + scene.camera.position["xyz".charAt(i)]
        + puzzle.size[i] / 2
    );
}
window.slices = [-1, -2, -3];
window.focusedSlice = 0;
window.minorAxis = {active: false, axis: -1, direction: -1};
window.updateSlicer = function () {
    let focusedButtons = document.getElementsByClassName("slicer_button_focused");
    for(let i = focusedButtons.length - 1; i >= 0; i--) focusedButtons[i].classList.remove("slicer_button_focused");
    let focusedLayer = document.getElementsByClassName("focused_layer");
    if(focusedLayer.length != 0) focusedLayer[0].classList.remove("focused_layer");
    let layers = document.getElementsByClassName("slicer_layer");
    for(let i = 0; i < fullPuzzle.dimension; i++) {
        if(slices[i] < 0) layers[i].children[0].innerText = "xyz".charAt(-1 - slices[i]);
        else layers[i].children[0].innerText = slices[i] + 1;
    }
    layers[focusedSlice].classList.add("focused_layer");
}
window.generateSlicer = function () {
    const slicer = fromId("slicer");
    slicer.innerHTML = "";
    if(fullPuzzle.dimension == 2 || fullPuzzle.dimension == 1) {
        slices = [-1, -3];
        updateScene();
        return;
    }
    for(let i = 0; i < fullPuzzle.dimension; i++) {
        let layer = document.createElement("div");
        layer.id = "slicer_layer_" + i;
        layer.appendChild(document.createElement("span"));
        layer.children[0].classList.add("slicer_display");
        layer.classList = "slicer_layer";
        let xyz = "xyz";
        for(let x = 0; x < 2; x++) {
            let button = document.createElement("button");
            button.innerText = "+-".charAt(x);
            button.classList = "slicer_button";
            button.id = "slicer_button_" + i + "_" + ["plus", "minus"][x];
            button.onclick = function () {
                //Create minor axis
                if(slices[i] < 0) {
                    minorAxis.direction = - 1 - slices[i];
                    minorAxis.axis = i;
                    minorAxis.active = true;
                    if(x == 0) slices[i] = 0;
                    if(x == 1) slices[i] = fullPuzzle.size[i] - 1;
                }
                //Else move layer
                else slices[i] -= Math.round((x - 0.5) * 2);
                //If out of bounds
                if(slices[i] >= fullPuzzle.size[i] || slices[i] < 0) {
                    if(minorAxis.active) {
                        slices[i] = -1 - minorAxis.direction;
                        minorAxis.active = false;
                    }
                    else if(slices[i] <= 0) slices[i] = fullPuzzle.size[i] - 1;
                    else slices[i] = 0;
                }
                focusedSlice = i;
                updateScene();
                updateSlicer();
            }
            layer.appendChild(button);
        }
        for(let x = 0; x < 3; x++) {
            let button = document.createElement("button");
            button.innerText = xyz.charAt(x);
            button.classList = "slicer_button";
            button.classList.add("slicer_button_dim_" + x);
            button.id = "slicer_button_" + i + "_" + (-1 - x);
            button.onclick = function () {
                if(minorAxis.active && minorAxis.direction == i) {
                    minorAxis.active = false;
                }
                slices[slices.indexOf(-1 - x)] = 0;
                slices[i] = -1 - x;
                focusedSlice = i;
                updateScene();
                updateSlicer();
            }
            layer.appendChild(button);
        }
        slicer.appendChild(layer);
    }
}