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
        text: {
            painted: [],
            unsure: [],
            texture: [],
        }
    },
    geometry: {
    },
    debug: {
    },
    sliceGuides: [],
    render: function () {
        input.updateSelectedFace();
        requestAnimationFrame(scene.render);
        if(input.doRender) {
            scene.renderer.clear();
            scene.renderer.render(scene.obj, scene.camera);
            input.doRender = false;
        }
    },
    viewportResize: function () {
        //Compute camera variables
        let frustumSize = 10;
        let aspectRatio = window.innerWidth / window.innerHeight;
        let aspect = Math.sqrt(aspectRatio);
        input.boxSize = window.innerWidth / 2 / frustumSize / aspect;
        //Change camera viewport
        scene.camera.left = -frustumSize * aspect;
        scene.camera.right = frustumSize * aspect;
        scene.camera.top = frustumSize / aspect;
        scene.camera.bottom = -frustumSize / aspect;
        scene.camera.updateMatrixWorld();
        scene.camera.updateProjectionMatrix();
        scene.renderer.setSize(window.innerWidth, window.innerHeight, true);
    },
    createBasics: function () {
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
        //Selectors
        scene.faceSelector = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), new THREE.MeshStandardMaterial({color: 0x0000FF, side: THREE.DoubleSide}));
        scene.obj.add(scene.faceSelector);
        for(let i = 0; i < 3; i++) {
            scene.sliceGuides[i] = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({color: 0xFF0000 >> (i * 8)}));
            scene.obj.add(scene.sliceGuides[i]);
        }
        //Debug objects
        //scene.debug.cursorIndicator=new THREE.Mesh(geometry,scene.materials.painted);
        //scene.obj.add(scene.debug.cursorIndicator);
        input.doRender = true;
    },
    updateVoxel: function (position, newType) {
        let old = puzzle.shape[position];
        if(old == newType) return;
        //Update both puzzle objects
        puzzle.shape[position] = newType;
        fullPuzzle.shape[fullPuzzle.unslicePosition(position, slicer.getRendered())] = newType;
        //Update mesh in scene
        let xyz = puzzle.getXYZ(position);
        scene.obj.remove(scene.voxels[position]);
        scene.voxels[position] = scene.createVoxelMesh(xyz[0], xyz[1], xyz[2], position);
        scene.obj.add(scene.voxels[position]);
        //Render surrounding objects if broken
        if(newType == cell_broken) {
            puzzle.generateSidesVisible();
            scene.update();
        }
    },
    updateVoxels: function () {
        scene.destroyObjects(scene.voxels);
        puzzle.generateSidesVisible();
        scene.geometry.box = new THREE.BoxGeometry(1, 1, 1);
        scene.geometry.wire = new THREE.EdgesGeometry(scene.geometry.box);
        scene.geometry.wire.scale(1.001, 1.001, 1.001);
        //Loop through voxels
        const size = puzzle.size;
        for(let x = 0; x < size[0]; x++) for(let y = 0; y < size[1]; y++) for(let z = 0; z < size[2]; z++) {
            //Find array index of voxels
            let position = x + (y + z * size[1]) * size[0];
            scene.voxels[position] = scene.createVoxelMesh(x, y, z, position);
            scene.obj.add(scene.voxels[position]);
        }
    },
    recreate: function (reset = false) {
        if(reset) {
            slicer.slices = [-1, -2, -3];
            slicer.minorAxis = -1;
            for(let i = 3; i < fullPuzzle.dimension; i++) slicer.slices.push(0);
        }
        let renderedSlices = slicer.slices.slice();
        renderedSlices[slicer.minorAxis] = -1 - slicer.minorDirection;
        puzzle.sliceFrom(renderedSlices, fullPuzzle);
        scene.updateVoxels();
        scene.update();
    },
    createVoxelMesh: function (x, y, z, position) {
        let cell = puzzle.shape[position];
        let materials = [];
        for(let i = 0; i < 3; i++) {
            let hint = puzzle.getHintPosition(position, i);
            let material = this.getVoxelTexture(puzzle.hintsTotal[hint], puzzle.hintsPieces[hint], cell);
            materials[i * 2] = material;
            materials[i * 2 + 1] = material;
        }
        let mesh = new THREE.Mesh(scene.geometry.box, materials);
        let pos = new THREE.Vector3(x - puzzle.size[0] / 2 + 0.5, y - puzzle.size[1] / 2 + 0.5, z - puzzle.size[2] / 2 + 0.5);
        mesh.position.copy(pos);

        mesh.add(new THREE.LineSegments(scene.geometry.wire, scene.materials.wire));
        return mesh;
    },
    getVoxelTexture: function (hint, hintPieces, cellType) {
        if(cellType != 2 && cellType != 3) return scene.materials.unsure;
        let type = ["", "", "painted", "unsure"][cellType];
        if(hintPieces == 0) return scene.materials[type];
        else if(scene.materials.text[type][hint] == null) {
            scene.materials.text[type][hint] = new THREE.MeshStandardMaterial().copy(scene.materials[type]);
            let texture = scene.getTextTexture(hint);
            scene.materials.text[type][hint].map = texture;
        }
        return scene.materials.text[type][hint];
    },
    getTextTexture: function (num) {
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
    },
    update: function () {
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
        for(let i = 0; i < 3; i++) {
            if(slicer.minorDirection != i && slicer.minorAxis != -1) {
                scene.sliceGuides[i].visible = false;
                continue;
            }
            else scene.sliceGuides[i].visible = true;
            let char = "xyz".charAt(i);
            let halfAxes = [1, 2, 1];
            let otherAxes = [2, 0, 0];
            let position = new THREE.Vector3(0, 0, 0);
            let cameraFacing = scene.camera.position[char] < 0;
            position[char] = (puzzle.size[i] + 0.75) * (cameraFacing ? -1 : 1) / 2;
            if(slicer.minorDirection == i && slicer.minorAxis != -1) {
                position[char] += slicer.slices[slicer.minorAxis];
                position[char] -= (cameraFacing ? 0 : puzzle.size[slicer.minorDirection] - 1);
            }
            position["xyz".charAt(halfAxes[i])] = 0;
            position["xyz".charAt(otherAxes[i])] = (puzzle.size[otherAxes[i]] + 0.75) * (scene.camera.position["xyz".charAt(otherAxes[i])] < 0 ? 1 : -1) / 2;
            scene.sliceGuides[i].position.copy(position);
        }
        input.doRender = true;
    },
    destroyObjects: function (object) {
        if(typeof object != "object") return;
        else if(object instanceof THREE.Mesh || object instanceof THREE.Line) this.obj.remove(object);
        else if(object instanceof THREE.Object3D) return;
        else if(object instanceof THREE.Material) return;
        else for(let i in object) this.destroyObjects(object[i]);
    }
};
window.input = {
    addListeners: function () {
        window.addEventListener("mousedown", input.mousedown);
        window.addEventListener("touchstart", input.mousedown);
        window.addEventListener("mouseup", input.mouseup);
        window.addEventListener("touchend", input.mouseup);
        window.addEventListener("mousemove", input.mousemove);
        window.addEventListener("touchmove", input.mousemove);
        window.addEventListener("resize", scene.viewportResize);
    },
    mouseGet: function (e, touchIndex) {
        if(e.type.includes("touch")) {
            return {
                x: e.touches[touchIndex].clientX - window.innerWidth / 2,
                y: -e.touches[touchIndex].clientY + window.innerHeight / 2
            };
        }
        return {
            x: e.clientX - window.innerWidth / 2,
            y: -e.clientY + window.innerHeight / 2
        };
    },
    mouseup: function (e) {
        input.prev = {pos: -1, face: -1};
        input.setType = -1;
        slicer.active = false;
    },
    mousedown: function (e) {
        input.latestEvent = e;
        let m = input.mouseGet(e, 0);
        input.mouseX = m.x;
        input.mouseY = m.y;
        input.onclick();
    },
    mousemove: function (e) {
        e.preventDefault();
        input.pmouseX = input.mouseX;
        input.pmouseY = input.mouseY;
        let m = input.mouseGet(e, 0);
        input.mouseX = m.x;
        input.mouseY = m.y;
        input.latestEvent = e;
        if(slicer.active) return slicer.drag();
        if(e.buttons & 1 == 1 || e.type == "touchmove") {
            if(e.ctrlKey || e.shiftKey) {
                input.cubeClick();
            }
            else input.updateRotation();
        }
    },
    onclick: function () {
        slicer.testClick();
        input.cubeClick();
    },
    onload: function () {
        input.addListeners();
        scene.createBasics();
        scene.viewportResize();
        slicer.create(puzzle);
        scene.recreate();
        scene.render();
        console.log("loading");
    },
    cubeClick: function () {
        let e = input.latestEvent;
        let cursorPos = input.getCursorPosition();
        let direction = new THREE.Vector3(0, 0, 0).copy(scene.camera.position).multiplyScalar(-1).normalize();
        let intersection = puzzle.rayIntersect(cursorPos, direction.toArray());
        if(intersection.pos != -1) {
            if(input.prevVoxel.face != intersection.face && input.prevVoxel.face != -1) return;
            if(slicer.minorAxis != -1) {
                //Prevent from unfocused cubes
                if(slicer.slices[slicer.minorAxis] != Math.floor(intersection.pos / puzzle.spacing[slicer.minorDirection]) % puzzle.size[slicer.minorDirection]) return;
            }
            let current = puzzle.shape[intersection.pos];
            if(e.ctrlKey && current != cell_colored) {
                scene.updateVoxel(intersection.pos, cell_broken);
            }
            if(e.shiftKey) {
                if(input.setType == -1) input.setType = [0, 1, 3, 2][current];
                scene.updateVoxel(intersection.pos, input.setType);
            }
        }
        input.prev = intersection;
    },
    prevVoxel: {pos: -1, face: -1},
    paintType: -1,
    xRot: 0,
    yRot: 0,
    mouseX: 0,
    pmouseX: 0,
    mouseY: 0,
    pmouseY: 0,
    selectedBlock: -1,
    selectedFace: -1,
    latestEvent: {},
    doRender: true,
    boxSize: 0,
    updateSelectedFace: function () {
        if(input.latestEvent.shiftKey || input.latestEvent.ctrlKey) {
            let cursorPos = input.getCursorPosition();
            let direction = new THREE.Vector3(0, 0, 0).copy(scene.camera.position).multiplyScalar(-1).normalize();
            let intersection = puzzle.rayIntersect(cursorPos, direction.toArray());
            if(intersection.pos != -1) if(input.selectedBlock != intersection.pos || input.selectedFace != intersection.face) {
                //scene.voxels[input.selectedBlock].material = scene.materials.selected;
                scene.faceSelector.position.copy(scene.voxels[intersection.pos].position);
                scene.faceSelector.position["xxyyzz".charAt(intersection.face)] += 0.51 * (intersection.face % 2 == 0 ? -1 : 1);
                let rot = new THREE.Euler(0, 0, 0);
                rot["yyxxzz".charAt(intersection.face)] = Math.PI / 2;
                scene.faceSelector.setRotationFromEuler(rot);
                input.doRender = true;
            }
            input.selectedBlock = intersection.pos;
            input.selectedFace = intersection.face;
        }
        else input.selectedBlock = -1;
    },
    updateRotation: function () {
        let oldVisibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
        const mouseSpeed = 0.006;
        this.yRot -= (this.pmouseX - this.mouseX) * mouseSpeed;
        this.xRot += (this.pmouseY - this.mouseY) * mouseSpeed;
        if(this.xRot > Math.PI / 2) this.xRot = Math.PI / 2;
        if(this.xRot < -Math.PI / 2) this.xRot = -Math.PI / 2;
        this.yRot = (this.yRot + Math.PI * 2) % (Math.PI * 2);
        scene.camera.position.set(Math.sin(this.yRot) * - Math.cos(this.xRot), Math.sin(this.xRot), Math.cos(this.xRot) * Math.cos(this.yRot));
        scene.camera.position.multiplyScalar(50);
        scene.camera.lookAt(0, 0, 0);
        scene.camera.updateProjectionMatrix();
        let visibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
        if(oldVisibleSideMap != visibleSideMap) scene.update();
        input.doRender = true;
    },
    getCursorPosition: function () {
        const normalize = vector => {
            let magnitude = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
            return vector.map(v => v / magnitude);
        }
        let xRot = this.xRot;
        let yRot = this.yRot;
        let xPixelStep = normalize([1, 0, Math.tan(yRot)]);
        //Reverse xPixel step if looking the other way
        if(yRot > Math.PI / 2 && yRot < 3 * Math.PI / 2) {
            xPixelStep[0] = -xPixelStep[0];
            xPixelStep[2] = -xPixelStep[2];
        }
        let yPixelStep = normalize([Math.sin(yRot), 1 / Math.tan(xRot), -Math.cos(yRot)]);
        return yPixelStep.map((yStep, i) =>
            yStep * (Math.sign(xRot) * this.mouseY / this.boxSize)
            + xPixelStep[i] * (this.mouseX / this.boxSize)
            + scene.camera.position["xyz".charAt(i)]
            + puzzle.size[i] / 2
        );
    }
};
window.slicer = {
    minorAxis: -1,
    minorDirection: -1,
    slices: [],
    dimension: -1,
    active: false,
    cursorStart: [],
    cursorUnit: [],
    offset: 0,
    selected: 0,
    create: function (puzzle) {
        this.slices = new Array(fullPuzzle.dimension);
        this.element = fromId("slicer");
        this.element.innerHTML = "";
        this.minorAxis = -1;
        this.maxes = puzzle.size.slice();
        this.dimension = puzzle.dimension;

        this.active = false;

        if(puzzle.dimension == 2 || puzzle.dimension == 1) {
            this.slices = [-1, -3];
            this.updateDisplay(1);
            this.updateDisplay(0);
            scene.recreate();
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
    },
    testClick: function () {
        let caster = new THREE.Raycaster();
        caster.setFromCamera(new THREE.Vector2(input.mouseX / window.innerWidth * 2, input.mouseY / window.innerHeight * 2), scene.camera);
        let intersects = caster.intersectObjects(scene.sliceGuides, false);
        if(intersects.length != 0) {
            let uuid = intersects[0].object.uuid;
            for(let i = 0; i < 3; i++) if(scene.sliceGuides[i].uuid == uuid) this.minorDirection = i;
            if(this.minorAxis == -1) this.minorAxis = slicer.slices.indexOf(-1 - this.minorDirection);
            this.active = true;
            this.cursorStart = [input.mouseX, input.mouseY];
            this.offset = Math.max(this.slices[this.minorAxis], -1);
            let yTheta = input.yRot, xTheta = input.xRot;
            if(this.minorDirection == 0) this.cursorUnit = [Math.cos(yTheta), Math.sin(yTheta) * Math.sin(xTheta)];
            if(this.minorDirection == 1) this.cursorUnit = [0, Math.cos(xTheta)];
            if(this.minorDirection == 2) this.cursorUnit = [Math.sin(yTheta), -Math.cos(yTheta) * Math.sin(xTheta)];
            this.cursorUnit[0] *= input.boxSize;
            this.cursorUnit[1] *= input.boxSize;
        }

    },
    getRendered: function () {
        let sliceCopy = this.slices.slice();
        sliceCopy[this.minorAxis] = -1 - this.minorDirection;
        return sliceCopy;
    },
    drag: function () {
        if(this.minorAxis == -1) return;
        let dim = this.minorDirection;
        let max = this.maxes[this.minorAxis];
        let mouseDelta = [input.mouseX - this.cursorStart[0], input.mouseY - this.cursorStart[1]];
        let x = this.cursorUnit[0], y = this.cursorUnit[1];
        let unitLength = Math.sqrt(x ** 2 + y ** 2);
        let unitAngle = Math.atan(y / x);
        if(x < 0) unitAngle += Math.PI;
        let distance = mouseDelta[0] * Math.cos(unitAngle) + mouseDelta[1] * Math.sin(unitAngle);
        distance /= unitLength;
        //Calculate selected layer
        let cameraFacing = scene.camera.position["xyz".charAt(dim)] > 0;
        if(this.offset == -1) {
            if(cameraFacing) distance = max - 1 + distance;
        }
        else distance += this.offset;
        this.selected = Math.min(Math.max(Math.round(distance), 0), puzzle.size[dim] - 1);
        //Reset if pulled back
        if(distance < -0.5 && !cameraFacing) {
            this.selected = 0;
            this.update(this.minorAxis, -1 - this.minorDirection, "set");
        }
        else if(distance >= this.maxes[this.minorAxis] && cameraFacing) {
            this.selected = max;
            this.update(this.minorAxis, -1 - this.minorDirection, "set");
        }
        //Ignore if no change
        else if(this.slices[slicer.minorAxis] == this.selected);
        //Edit position
        else this.update(this.minorAxis, this.selected, "set");
        return;

    },
    update: function (index, newValue, setType, allowMinor) {
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
                if(index == this.minorAxis) {
                    if(newValue < 0 || newValue >= this.maxes[index]) {
                        slices[index] = -1 - this.minorDirection;
                        newValue = -1 - this.minorDirection;
                    }
                }
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
        if(forceRecreateScene) scene.recreate();
        scene.update();
    },
    updateDisplay: function (layer) {
        //Update display
        if(this.slices[layer] < 0) fromClass("slicer_display")[layer].innerText = "xyz".charAt(-1 - this.slices[layer]);
        else fromClass("slicer_display")[layer].innerText = this.slices[layer] + 1;
        //Update focused Layer
        if(this.focusedSlice != layer) {
            this.focusedSlice = layer;
            if(fromClass("focused_layer").length != 0) fromClass("focused_layer")[0].classList.remove("focused_layer");
            fromClass("slicer_layer")[layer].classList.add("focused_layer");
        }
    },
};
window.addEventListener("load", input.onload);
