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
        doRender: true
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
            scene.input.doRender = true;
        }
        scene.input.selectedBlock = intersection.pos;
        scene.input.selectedFace = intersection.face;
    }
    else scene.input.selectedBlock = -1;
    requestAnimationFrame(render);
    if(scene.input.doRender) {
        scene.renderer.clear();
        scene.renderer.render(scene.obj, scene.camera);
        scene.input.doRender = false;
    }
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
    //Debug objects
    scene.faceSelector = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), new THREE.MeshStandardMaterial({color: 0x0000FF, side: THREE.DoubleSide}));
    scene.obj.add(scene.faceSelector);
    //scene.debug.cursorIndicator=new THREE.Mesh(geometry,scene.materials.painted);
    //scene.obj.add(scene.debug.cursorIndicator);
    scene.input.doRender = true;
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
window.recreateScene = function (reset = false) {
    if(reset) {
        slicer.slices = [-1, -2, -3];
        slicer.minorAxis = -1;
        for(let i = 3; i < fullPuzzle.dimension; i++) slicer.slices.push(0);
    }
    let renderedSlices = slicer.slices.slice();
    renderedSlices[slicer.minorAxis] = -1 - slicer.minorDirection;
    puzzle.sliceFrom(renderedSlices, fullPuzzle);
    updateVoxels();
    updateScene();
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
window.updateRotation = function () {
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
    let visibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
    if(oldVisibleSideMap != visibleSideMap) updateScene();
    scene.input.doRender = true;
}
window.updateScene = function () {
    let visibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
    puzzle.foreachCell((cell, i, pos) => {
        let isVisible = (puzzle.visibleSides[i] & visibleSideMap);
        if(slicer.minorAxis != -1) {
            //Hide if in front of selected slice
            if((pos[slicer.minorDirection] > slicer.slices[slicer.minorAxis] ? 1 : 0) ^ (scene.camera.position["xyz".charAt(slicer.minorDirection)] > 0 ? 0 : 1)) isVisible = 0;
            //Show if is in selected slice
            if(pos[slicer.minorDirection] == slicer.slices[slicer.minorAxis]) {
                if(puzzle.shape[i] != cell_broken) isVisible = 1;
            }
        }
        scene.voxels[i].visible = !!isVisible;
    });
    scene.input.doRender=true;
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
window.slicer = null;
class Slicer {
    constructor(puzzle) {
        this.slices = new Array(fullPuzzle.dimension);
        this.element = fromId("slicer");
        this.element.innerHTML = "";
        this.minorAxis = -1;
        this.minorDirection = -1;
        this.maxes = puzzle.size.slice();
        this.dimension = puzzle.dimension;
        if(puzzle.dimension == 2 || puzzle.dimension == 1) {
            this.slices = [-1, -3];
            this.updateDisplay(1);
            this.updateDisplay(0);
            recreateScene();
            return;
        }
        //Generate buttons
        for(let i = 0; i < puzzle.dimension; i++) {
            if(i < 3) this.slices[i] = -1 - i;
            else this.slices[i] = 0;
            let layer = document.createElement("div");
            layer.id = "slicer_layer_" + i;
            layer.appendChild(document.createElement("span"));
            layer.children[0].classList.add("slicer_display");
            layer.classList = "slicer_layer";
            //+ - buttons
            for(let x = 0; x < 2; x++) {
                let html = `
                <button
                    class="slicer_button"
                    id="slicer_button_${i}_${["plus", "minus"][x]}"
                    onclick="slicer.update(${i},null,'${["inc", "dec"][x]}')">
                    ${"+-".charAt(x)}
                </button>`;
                layer.innerHTML += html;
            }
            //XYZ buttons
            for(let x = 0; x < 3; x++) {
                let html = `
                <button
                    class="slicer_button slicer_button_dim_${x}"
                    id="slicer_button_${i}_${-1 - x}"
                    onclick="slicer.update(${i},${-1 - x},'set')">
                    ${"xyz".charAt(x)}
                </button>`;
                layer.innerHTML += html;
            }
            this.element.appendChild(layer);
        }
        //Update display
        for(let i = 0; i < puzzle.dimension; i++) {
            this.updateDisplay(i);
        }
        //Set focused layer to first
        this.updateDisplay(0);
    }
};
Slicer.prototype.update = function (index, newValue, setType, allowMinor) {
    if(index < 0 || index >= this.dimension) index = (index + this.dimension * 10) % this.dimension;
    let slices = this.slices;
    let forceRecreateScene = false;
    if(setType == "inc" || setType == "dec") {
        //Create minor axis
        if(this.slices[index] < 0 && !allowMinor) {
            if(this.minorAxis != -1 && this.minorAxis != index) {
                forceRecreateScene = true;
            }
            this.minorDirection = - 1 - this.slices[index];
            this.minorAxis = index;
            if(setType == "inc") slices[index] = -1;
            if(setType == "dec") slices[index] = this.maxes[index];
        }
        if(setType == "inc") slices[index]++;
        else slices[index]--;
        //If out of bounds
        if(slices[index] >= fullPuzzle.size[index] || slices[index] < 0) {
            //Set to axis if minor axis
            if(this.minorAxis == index) {
                slices[index] = -1 - this.minorDirection;
                this.minorAxis = -1;
            }
            //Or wrap if not
            else if(setType == "inc") slices[index] = 0;
            else slices[index] = this.maxes[index] - 1;
        }
        //Don't update whole scene if change is along minor axis
        if(this.minorAxis != index) forceRecreateScene = true;
    }
    else if(setType == "set") {
        //Create minor axis if applicable
        if(slices[index] < 0 && newValue >= 0 && !allowMinor) {
            this.minorDirection = - 1 - slices[index];
            this.minorAxis = index;
            slices[index] = newValue;
        }
        else {
            //Delete minor axis if conflicts with new value
            if(this.minorDirection == -1 - newValue) {
                this.minorAxis = -1;
            }
            //Set old axis to layer1 if conflicts
            if(newValue < 0) {
                let location = slices.indexOf(newValue);
                slices[location] = 0;
                if(location != -1) this.updateDisplay(location);
            }
            //Set new value and update Scene
            slices[index] = newValue;
            if(this.minorAxis != index || newValue < 0) forceRecreateScene = true;
        }
    }
    this.updateDisplay(index);
    if(forceRecreateScene) recreateScene();
    updateScene();
}
Slicer.prototype.updateDisplay = function (layer) {
    //Update display
    if(this.slices[layer] < 0) fromClass("slicer_display")[layer].innerText = "xyz".charAt(-1 - this.slices[layer]);
    else fromClass("slicer_display")[layer].innerText = this.slices[layer] + 1;
    //Update focused Layer
    if(this.focusedSlice != layer) {
        this.focusedSlice = layer;
        if(fromClass("focused_layer").length != 0) fromClass("focused_layer")[0].classList.remove("focused_layer");
        fromClass("slicer_layer")[layer].classList.add("focused_layer");
    }
}
window.Slicer = Slicer;